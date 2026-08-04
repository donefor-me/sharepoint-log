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

  private determineIncrementalStartTime(lastSyncTime: Date | null): Date {
    const now = new Date()
    if (!lastSyncTime) {
      return new Date(now.getTime() - SYNC_CONFIG.WINDOW_SPAN_MS)
    }
    return new Date(now.getTime() - SYNC_CONFIG.OVERLAP_WINDOW_MS)
  }

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

  async runFullReconciliation(): Promise<void> {
    await this.executeWithLock('full reconciliation', async () => {
      const now = new Date()
      const start = new Date(
        now.getTime() - SYNC_CONFIG.RECONCILIATION_BACKFILL_MS,
      )
      await this.runWindowLoop(start, now)
    })
  }

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

  // Fix B2: Process each page immediately instead of accumulating all in memory
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
