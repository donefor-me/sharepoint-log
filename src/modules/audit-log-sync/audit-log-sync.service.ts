import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { SharepointService } from '@modules/sharepoint/sharepoint.service'
import { AuditLog } from './entities/audit-log.entity'
import { SharepointContentDto } from '@modules/sharepoint/dto/sharepoint-management.dto'
import { chunkArray } from '../../utils/array.util'

import { Logger } from '@common/logger'
import { Office365WorkloadType } from './constants/workload.constant'
import { withRetry } from '@utils/http-retry.util'
import { InfrastructureException } from '@common/exceptions'

@Injectable()
export class AuditLogSyncService {
  constructor(
    private readonly sharepointService: SharepointService,
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(AuditLogSyncService.name)
  }

  /**
   * Processes a list of SharePoint content files in parallel batches.
   * Downloads blobs directly in memory and relies on Database UPSERT for idempotency.
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

    for (const batch of chunkArray(files, concurrencyLimit)) {
      const results = await Promise.allSettled(
        batch.map((file) => withRetry(() => this.processSingleFile(file))),
      )

      const failedCount = results.filter((r) => r.status === 'rejected').length

      if (failedCount > 0) {
        this.logger.error(`Failed to download ${failedCount} blobs in batch`)
        throw new InfrastructureException(
          `Batch processing failed for ${failedCount} files, halting sync to prevent data loss.`,
        )
      }
    }
  }

  /**
   * Downloads and processes a single SharePoint audit log blob file.
   * Performs data chunking and executes a bulk UPSERT within a single database transaction.
   *
   * @param {SharepointContentDto} file - The file metadata representing the blob to download.
   * @returns {Promise<void>} A promise that resolves when the blob is successfully downloaded and inserted into the database.
   */
  private async processSingleFile(file: SharepointContentDto): Promise<void> {
    const rawLogs = await this.sharepointService.fetchActivityContent(
      file.contentUri,
    )

    if (!rawLogs || rawLogs.length === 0) {
      return
    }

    await this.dataSource.transaction(async (tx) => {
      for (const chunk of chunkArray(rawLogs, 2000)) {
        const entities = chunk
          .map((log: any) => ({
            id: String(log.Id),
            contentId: file.contentId,
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
    })
  }
}
