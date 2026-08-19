import { chunkArray, runPool } from '@common/utils/array.util'
import { withRetry } from '@common/utils/http-retry.util'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'

import { SharepointContentDto } from '../integration/dto/sharepoint-management.dto'
import { SharepointService } from '../integration/sharepoint.service'
import { AuditLogDlqStatus } from './constants/dlq-status.constant'
import { SYNC_CONFIG } from './constants/sync.constant'
import { Office365WorkloadType } from './constants/workload.constant'
import { AuditLog } from './entities/audit-log.entity'
import { AuditLogDlq } from './entities/audit-log-dlq.entity'

@Injectable()
export class AuditLogSyncService {
  private readonly logger = new Logger(AuditLogSyncService.name)

  constructor(
    private readonly sharepointService: SharepointService,
    private readonly dataSource: DataSource,
    @InjectRepository(AuditLogDlq)
    private readonly dlqRepo: Repository<AuditLogDlq>,
  ) {}

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
    let skipRecords = 0

    while (true) {
      const pendingLogs = await this.dlqRepo.find({
        where: { status: AuditLogDlqStatus.PENDING },
        order: { retryCount: 'ASC', createdAt: 'ASC' },
        take: 1000,
        skip: skipRecords,
      })

      if (pendingLogs.length === 0) {
        break
      }

      this.logger.log(
        { action: 'dlq_process_batch', count: pendingLogs.length },
        '[Sync:DLQ] Processing batch of pending logs',
      )

      const doneLogUris: string[] = []
      const failedLogs: AuditLogDlq[] = []

      const tasks = pendingLogs.map((log) => async () => {
        await withRetry(() =>
          this.processSingleFile(log.contentUri, log.contentId),
        )
        return log.contentUri
      })

      const settled = await runPool(tasks, SYNC_CONFIG.CONCURRENT_DOWNLOADS)

      for (let i = 0; i < settled.length; i++) {
        const result = settled[i]
        const log = pendingLogs[i]
        if (result.status === 'fulfilled') {
          doneLogUris.push(result.value)
        } else {
          log.retryCount += 1
          log.errorReason = (result.reason as Error).message
          if (log.retryCount >= SYNC_CONFIG.MAX_RETRY_PER_ID) {
            log.status = AuditLogDlqStatus.DLQ
          }
          failedLogs.push(log)
        }
      }
      if (doneLogUris.length > 0) {
        await this.dlqRepo.update(
          { contentUri: In(doneLogUris) },
          { status: AuditLogDlqStatus.DONE },
        )
      }

      if (failedLogs.length > 0) {
        await this.dlqRepo.save(failedLogs)
        totalFailed += failedLogs.length
        skipRecords += failedLogs.filter(
          (log) => log.status === AuditLogDlqStatus.PENDING,
        ).length
      }
    }

    return { failed: totalFailed }
  }

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
            microsoftId: String(log.Id),
            contentId: contentId,
            creationTime: log.CreationTime ? new Date(log.CreationTime) : null,
            operation: log.Operation,
            workload: log.Workload as Office365WorkloadType,
            userId: log.UserId,
            objectId: log.ObjectId,
            itemName: log.ItemName,
            rawData: log,
          }))
          .sort((a, b) => a.microsoftId.localeCompare(b.microsoftId))

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
