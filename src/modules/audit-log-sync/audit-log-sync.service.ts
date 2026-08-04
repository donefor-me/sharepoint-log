import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { SharepointService } from '../sharepoint/sharepoint.service'
import { AuditLog } from './entities/audit-log.entity'
import {
  AuditLogContentBlob,
  BlobDownloadStatus,
} from './entities/audit-log-content-blob.entity'
import { SharepointContentDto } from '../sharepoint/dto/sharepoint-management.dto'
import { AuditLogSyncState } from './entities/audit-log-sync-state.entity'
import { SyncLockService } from './sync-lock.service'
import { AuditLogRepository } from './repositories/audit-log.repository'
import { AuditLogBlobRepository } from './repositories/audit-log-blob.repository'
import { withRetry } from '@utils/http-retry.util'
import { SYNC_CONFIG } from './constants/sync.constant'
import { Logger } from '@common/logger'
import type { Office365WorkloadType } from './constants/workload.constant'
import { TimeWindowSchema, TimeWindowDto } from '@common/dto/time-window.dto'

@Injectable()
export class AuditLogSyncService {
  /**
   * Initializes the AuditLogSyncService with required repositories and services.
   *
   * @param {AuditLogRepository} logRepo - Repository for storing individual audit log entries.
   * @param {AuditLogBlobRepository} blobRepo - Repository for tracking content blob downloads.
   * @param {Repository<AuditLogSyncState>} syncStateRepo - Repository for managing synchronization watermarks.
   * @param {SharepointService} sharepointService - Service for interacting with the SharePoint API.
   * @param {SyncLockService} syncLockService - Service for managing distributed locks during sync.
   * @param {DataSource} dataSource - TypeORM data source for managing transactions.
   * @param {Logger} logger - Logger instance for the service.
   * @returns {void}
   */
  constructor(
    private readonly logRepo: AuditLogRepository,
    private readonly blobRepo: AuditLogBlobRepository,
    @InjectRepository(AuditLogSyncState)
    private readonly syncStateRepo: Repository<AuditLogSyncState>,
    private readonly sharepointService: SharepointService,
    private readonly syncLockService: SyncLockService,
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(AuditLogSyncService.name)
  }

  /**
   * Determines the start time for the next incremental sync.
   * If a previous sync time exists, adds an overlap window. Otherwise, falls back to the default window span.
   *
   * @param {Date | null} lastSyncTime - The timestamp of the last successful sync watermark.
   * @returns {Date} - The calculated start time for the sync window.
   */
  private determineIncrementalStartTime(lastSyncTime: Date | null): Date {
    const now = new Date()
    if (!lastSyncTime) {
      return new Date(now.getTime() - SYNC_CONFIG.WINDOW_SPAN_MS)
    }
    return new Date(now.getTime() - SYNC_CONFIG.OVERLAP_WINDOW_MS)
  }

  /**
   * Executes a synchronization task after acquiring an exclusive distributed lock.
   * Ensures that only one instance of the task runs at any time.
   *
   * @param {string} taskName - A descriptive name for the task being executed (used for logging).
   * @param {() => Promise<void>} syncLogic - A callback function containing the actual sync logic.
   * @returns {Promise<void>}
   */
  private async executeWithLock(
    taskName: string,
    syncLogic: () => Promise<void>,
  ): Promise<void> {
    const locked = await this.syncLockService.acquire()
    if (!locked) {
      this.logger.warn(`Skipping ${taskName}: lock is held by another instance`)
      return
    }
    try {
      await syncLogic()
    } finally {
      await this.syncLockService.release()
    }
  }

  /**
   * Orchestrates the incremental synchronization process by fetching the latest watermark,
   * determining the sync window, and executing the sync loop safely within a lock.
   *
   * @returns {Promise<void>}
   */
  async runIncrementalSync(): Promise<void> {
    await this.executeWithLock('incremental sync', async () => {
      const stateRow = await this.syncStateRepo.findOne({
        where: { key: SYNC_CONFIG.STATE_WATERMARK_KEY },
      })
      const currentStart = this.determineIncrementalStartTime(
        stateRow?.value || null,
      )
      await this.runWindowLoop(currentStart, new Date())
    })
  }

  /**
   * Orchestrates a full reconciliation by running the sync loop over a larger, predefined backfill window.
   * Executes safely within a distributed lock.
   *
   * @returns {Promise<void>}
   */
  async runFullReconciliation(): Promise<void> {
    await this.executeWithLock('full reconciliation', async () => {
      const now = new Date()
      const start = new Date(
        now.getTime() - SYNC_CONFIG.RECONCILIATION_BACKFILL_MS,
      )
      await this.runWindowLoop(start, now)
    })
  }

  /**
   * Loops through time windows starting from a given date until the current date,
   * fetching and processing activity logs for each window.
   * Updates the sync watermark after successfully processing each window.
   *
   * @param {Date} start - The initial start time for the first sync window.
   * @param {Date} now - The end time representing the current moment.
   * @returns {Promise<void>}
   */
  private async runWindowLoop(start: Date, now: Date): Promise<void> {
    let currentStart = start
    while (currentStart < now) {
      // Renew lock before each window to prevent TTL expiry (Fix B5)
      await this.syncLockService.renewLock()

      let currentEnd = new Date(
        currentStart.getTime() + SYNC_CONFIG.WINDOW_SPAN_MS,
      )
      if (currentEnd > now) currentEnd = now

      const validated = TimeWindowSchema.parse({
        startTime: currentStart.toISOString(),
        endTime: currentEnd.toISOString(),
      })

      await this.executeSyncWindow(validated)

      let state = await this.syncStateRepo.findOne({
        where: { key: SYNC_CONFIG.STATE_WATERMARK_KEY },
      })
      if (!state) {
        state = this.syncStateRepo.create({
          key: SYNC_CONFIG.STATE_WATERMARK_KEY,
        })
      }
      state.value = currentEnd
      await this.syncStateRepo.save(state)
      currentStart = currentEnd
    }
  }

  /**
   * Processes a single time window by fetching metadata for content blobs and saving/downloading them.
   * Handles pagination by following the 'nextpageuri' header until all pages are retrieved.
   * Fix B2: Processes each page immediately instead of accumulating all in memory.
   *
   * @param {TimeWindowDto} timeWindow - The time window dto defining start and end boundaries.
   * @returns {Promise<void>}
   */
  private async executeSyncWindow(timeWindow: TimeWindowDto): Promise<void> {
    let nextPageUri: string | undefined =
      this.sharepointService.buildListUri(timeWindow)

    while (nextPageUri) {
      const { data, headers } = await withRetry(() =>
        this.sharepointService.fetchRaw(nextPageUri!),
      )

      const pendingBlobs = await this.filterAndSaveNewBlobs(data)
      if (pendingBlobs.length > 0) {
        await this.downloadPendingBlobs(pendingBlobs)
      }

      nextPageUri = headers['nextpageuri']
    }
  }

  /**
   * Downloads a batch of pending content blobs concurrently.
   * Tracks failures and updates the blob status in the database if errors occur.
   *
   * @param {AuditLogContentBlob[]} pendingBlobs - An array of blob entities waiting to be downloaded.
   * @returns {Promise<void>}
   */
  private async downloadPendingBlobs(
    pendingBlobs: AuditLogContentBlob[],
  ): Promise<void> {
    for (
      let i = 0;
      i < pendingBlobs.length;
      i += SYNC_CONFIG.CONCURRENT_DOWNLOADS
    ) {
      const batch = pendingBlobs.slice(i, i + SYNC_CONFIG.CONCURRENT_DOWNLOADS)
      const results = await Promise.allSettled(
        batch.map((blob) => withRetry(() => this.processBlob(blob))),
      )
      const failedIds = batch
        .filter((_, idx) => results[idx].status === 'rejected')
        .map((b) => b.contentId)
      if (failedIds.length > 0) {
        await this.blobRepo.bulkUpdateStatus(
          failedIds,
          BlobDownloadStatus.DOWNLOAD_FAILED,
        )
      }
    }
  }

  /**
   * Filters out already downloaded content blobs and saves metadata for the new ones.
   * Failed blobs from previous syncs are also returned for retry.
   *
   * @param {SharepointContentDto[]} contentList - Raw content blob metadata from the SharePoint API.
   * @returns {Promise<AuditLogContentBlob[]>} - A promise resolving to an array of blobs that need downloading.
   */
  private async filterAndSaveNewBlobs(
    contentList: SharepointContentDto[],
  ): Promise<AuditLogContentBlob[]> {
    if (!contentList.length) return []

    const existingBlobs = await this.blobRepo.findByContentIds(
      contentList.map((c) => c.contentId),
    )
    const existingMap = new Map(existingBlobs.map((b) => [b.contentId, b]))

    const pendingBlobs: AuditLogContentBlob[] = []
    const blobsToSave: AuditLogContentBlob[] = []

    for (const content of contentList) {
      const existingBlob = existingMap.get(content.contentId)
      if (!existingBlob) {
        const newBlob = this.blobRepo.create({
          contentId: content.contentId,
          contentUri: content.contentUri,
          contentType: content.contentType,
          status: BlobDownloadStatus.PENDING_DOWNLOAD,
        })
        blobsToSave.push(newBlob)
        pendingBlobs.push(newBlob)
      } else if (existingBlob.status === BlobDownloadStatus.DOWNLOAD_FAILED) {
        pendingBlobs.push(existingBlob)
      }
    }

    // Fix B6: saveMany chunks internally
    if (blobsToSave.length > 0) {
      await this.blobRepo.saveMany(blobsToSave)
    }
    return pendingBlobs
  }

  /**
   * Downloads and processes an individual content blob, extracting the audit logs inside it.
   * Inserts the parsed audit logs into the database in chunks via a transaction and marks the blob as successful.
   *
   * @param {AuditLogContentBlob} blob - The blob entity representing the file to download and process.
   * @returns {Promise<void>}
   */
  private async processBlob(blob: AuditLogContentBlob) {
    const logs = await this.sharepointService.fetchActivityContent(
      blob.contentUri,
    )

    if (!logs || logs.length === 0) {
      await this.blobRepo.updateStatus(
        blob.contentId,
        BlobDownloadStatus.DOWNLOADED_SUCCESS,
      )
      return
    }

    const logEntities = logs.map((log) =>
      this.logRepo.create({
        id: log.Id,
        contentId: blob.contentId,
        creationTime: log.CreationTime,
        operation: log.Operation,
        workload: log.Workload as Office365WorkloadType,
        userId: log.UserId,
        rawData: log,
      }),
    )

    await this.dataSource.transaction(async (manager) => {
      for (
        let j = 0;
        j < logEntities.length;
        j += SYNC_CONFIG.DB_INSERT_CHUNK_SIZE
      ) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(AuditLog)
          .values(
            logEntities.slice(j, j + SYNC_CONFIG.DB_INSERT_CHUNK_SIZE) as any[],
          )
          .orIgnore()
          .execute()
      }
      await manager.update(AuditLogContentBlob, blob.contentId, {
        status: BlobDownloadStatus.DOWNLOADED_SUCCESS,
      })
    })
  }
}
