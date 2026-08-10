import { chunkArray } from '@common/utils/array.util'
import { withRetry } from '@common/utils/http-retry.util'
import { Logger } from '@core/logger/logger.service'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import { SharepointContentDto } from '../integration/dto/sharepoint-management.dto'
import { SharepointService } from '../integration/sharepoint.service'
import { AuditLogDlqStatus } from './constants/dlq-status.constant'
import { SYNC_CONFIG } from './constants/sync.constant'
import { Office365WorkloadType } from './constants/workload.constant'
import { AuditLog } from './entities/audit-log.entity'
import { AuditLogDlq } from './entities/audit-log-dlq.entity'

@Injectable()
export class AuditLogSyncService {
  /**
   * Initializes the AuditLogSyncService and sets up the logger context.
   *
   * @param {SharepointService} sharepointService - The SharePoint service to fetch logs.
   * @param {DataSource} dataSource - The TypeORM data source for managing transactions.
   * @param {Repository<AuditLogDlq>} dlqRepo - The repository for the dead letter queue (pending/DLQ logs).
   * @param {Logger} logger - The logger instance.
   * @returns {void}
   */
  constructor(
    private readonly sharepointService: SharepointService,
    private readonly dataSource: DataSource,
    @InjectRepository(AuditLogDlq)
    private readonly dlqRepo: Repository<AuditLogDlq>,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(AuditLogSyncService.name)
  }

  /**
   * Accepts a batch of files and inserts them into the DLQ as PENDING (ignoring duplicates).
   * Does NOT trigger processing automatically.
   *
   * @param {SharepointContentDto[]} files - The files to process.
   * @returns {Promise<void>}
   */
  async insertToDlq(files: SharepointContentDto[]): Promise<void> {
    if (files.length > 0) {
      const entities = files.map((file) => {
        const entity = new AuditLogDlq()
        entity.contentUri = file.contentUri
        entity.contentId = file.contentId
        entity.status = AuditLogDlqStatus.PENDING
        return entity
      })

      await this.dlqRepo
        .createQueryBuilder()
        .insert()
        .into(AuditLogDlq)
        .values(entities)
        .orIgnore()
        .execute()
    }
  }

  /**
   * Processes all pending logs stored in the dead letter queue table.
   * Fetches detailed activity content from SharePoint and saves it to the database.
   * Handles retry logic and moves failed logs to the DLQ state upon hitting the max retry limit.
   *
   * @returns {Promise<{ failed: number }>} - A promise resolving to the number of failed logs.
   */
  async processPendingLogs(): Promise<{ failed: number }> {
    let totalFailed = 0
    let hasMore = true
    let skipRecords = 0

    while (hasMore) {
      const pendingLogs = await this.dlqRepo.find({
        where: { status: AuditLogDlqStatus.PENDING },
        order: { retryCount: 'ASC', createdAt: 'ASC' },
        take: 1000,
        skip: skipRecords,
      })

      if (pendingLogs.length === 0) {
        hasMore = false
        break
      }

      this.logger.log(
        `Processing batch of ${pendingLogs.length} pending logs...`,
      )

      for (const batch of chunkArray(
        pendingLogs,
        SYNC_CONFIG.CONCURRENT_DOWNLOADS,
      )) {
        const doneLogUris: string[] = []
        const failedLogs: AuditLogDlq[] = []

        await Promise.allSettled(
          batch.map(async (log) => {
            try {
              await withRetry(() =>
                this.processSingleFile(log.contentUri, log.contentId),
              )
              doneLogUris.push(log.contentUri)
            } catch (error: any) {
              log.retryCount += 1
              log.errorReason = error.message
              if (log.retryCount >= SYNC_CONFIG.MAX_RETRY_PER_ID) {
                log.status = AuditLogDlqStatus.DLQ
              }
              failedLogs.push(log)
            }
          }),
        )

        if (doneLogUris.length > 0) {
          await this.dlqRepo.update(doneLogUris, {
            status: AuditLogDlqStatus.DONE,
          })
        }

        if (failedLogs.length > 0) {
          await this.dlqRepo.save(failedLogs)
          totalFailed += failedLogs.length
          skipRecords += failedLogs.filter(
            (log) => log.status === AuditLogDlqStatus.PENDING,
          ).length
        }
      }
    }

    return { failed: totalFailed }
  }

  /**
   * Fetches raw logs from the SharePoint API for a specific content URI and saves them in batches.
   * Uses a database transaction to ensure atomicity and `orIgnore()` to prevent duplicate entries.
   *
   * @param {string} contentUri - The URI of the content blob to fetch.
   * @param {string} contentId - The unique identifier for the content blob.
   * @returns {Promise<void>} - A promise that resolves when the file is processed.
   * @throws {Error} - Thrown if fetching or saving the data fails.
   */
  private async processSingleFile(
    contentUri: string,
    contentId: string,
  ): Promise<void> {
    const rawLogs =
      await this.sharepointService.fetchActivityContent(contentUri)

    if (!rawLogs || rawLogs.length === 0) {
      return
    }

    await this.dataSource.transaction(async (tx) => {
      for (const chunk of chunkArray(rawLogs, 1000)) {
        const entities = chunk
          .map((log: any) => ({
            id: String(log.Id),
            contentId: contentId,
            creationTime: log.CreationTime ? new Date(log.CreationTime) : null,
            operation: log.Operation,
            workload: log.Workload as Office365WorkloadType,
            userId: log.UserId,
            objectId: log.ObjectId,
            itemName: log.ItemName,
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
