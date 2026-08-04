import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { SharepointService } from '@modules/sharepoint/sharepoint.service'
import { AuditLog } from './entities/audit-log.entity'
import {
  AuditLogContentBlob,
  BlobDownloadStatus,
} from './entities/audit-log-content-blob.entity'
import { SharepointContentDto } from '@modules/sharepoint/dto/sharepoint-management.dto'
import { AuditLogBlobRepository } from './repositories/audit-log-blob.repository'
import { chunkArray } from '../../utils/array.util'

import { Logger } from '@common/logger'
import { Office365WorkloadType } from './constants/workload.constant'
import { withRetry } from '@utils/http-retry.util'
import { InfrastructureException } from '@common/exceptions'

@Injectable()
export class AuditLogSyncService {
  constructor(
    private readonly sharepointService: SharepointService,
    private readonly blobRepo: AuditLogBlobRepository,
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(AuditLogSyncService.name)
  }

  /**
   * Processes a list of SharePoint content files in parallel batches.
   * Saves metadata for deduplication and downloads blobs based on the provided concurrency limit.
   *
   * @param {SharepointContentDto[]} files - The array of file metadata retrieved from SharePoint.
   * @param {number} concurrencyLimit - The maximum number of files to download concurrently in a single batch.
   * @returns {Promise<void>} A promise that resolves when all batches are processed successfully.
   * @throws {Error} If any file within a batch fails to download after retries, halting the sync process.
   */
  async processInBatches(
    files: SharepointContentDto[],
    concurrencyLimit: number,
  ): Promise<void> {
    if (!files.length) return

    const blobsToSave = files.map((f) =>
      this.blobRepo.create({
        contentId: f.contentId,
        contentUri: f.contentUri,
        contentType: f.contentType,
        status: BlobDownloadStatus.PENDING_DOWNLOAD,
      }),
    )

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(AuditLogContentBlob)
      .values(blobsToSave)
      .orIgnore()
      .execute()

    const existingBlobs = await this.blobRepo.findByContentIds(
      files.map((f) => f.contentId),
    )
    const pendingBlobs = existingBlobs.filter(
      (b) =>
        b.status === BlobDownloadStatus.PENDING_DOWNLOAD ||
        b.status === BlobDownloadStatus.DOWNLOAD_FAILED,
    )

    for (const batch of chunkArray(pendingBlobs, concurrencyLimit)) {
      const results = await Promise.allSettled(
        batch.map((blob) => withRetry(() => this.processSingleFile(blob))),
      )

      const failedIds = batch
        .filter((_, idx) => results[idx].status === 'rejected')
        .map((b) => b.contentId)

      if (failedIds.length > 0) {
        await this.blobRepo.bulkUpdateStatus(
          failedIds,
          BlobDownloadStatus.DOWNLOAD_FAILED,
        )
        this.logger.error(
          `Failed to download ${failedIds.length} blobs in batch`,
        )
        throw new InfrastructureException(
          `Batch processing failed for ${failedIds.length} files, halting sync to prevent data loss.`,
        )
      }
    }
  }

  /**
   * Downloads and processes a single SharePoint audit log blob file.
   * Performs data chunking and executes a bulk UPSERT within a single database transaction.
   *
   * @param {AuditLogContentBlob} blob - The local database entity representing the blob to download.
   * @returns {Promise<void>} A promise that resolves when the blob is successfully downloaded and inserted into the database.
   */
  private async processSingleFile(blob: AuditLogContentBlob): Promise<void> {
    const rawLogs = await this.sharepointService.fetchActivityContent(
      blob.contentUri,
    )

    if (!rawLogs || rawLogs.length === 0) {
      await this.blobRepo.updateStatus(
        blob.contentId,
        BlobDownloadStatus.DOWNLOADED_SUCCESS,
      )
      return
    }

    await this.dataSource.transaction(async (tx) => {
      for (const chunk of chunkArray(rawLogs, 2000)) {
        const entities = chunk
          .map((log: any) => ({
            id: String(log.Id),
            contentId: blob.contentId,
            creationTime: log.CreationTime,
            operation: log.Operation,
            workload: log.Workload as Office365WorkloadType,
            userId: log.UserId,
            rawData: log,
          }))
          .sort((a, b) => a.id.localeCompare(b.id))

        await tx
          .createQueryBuilder()
          .insert()
          .into(AuditLog)
          .values(entities)
          .orIgnore()
          .execute()
      }

      await tx.update(AuditLogContentBlob, blob.contentId, {
        status: BlobDownloadStatus.DOWNLOADED_SUCCESS,
      })
    })
  }
}
