import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { AuditLogSyncService } from '@modules/audit-log-sync/audit-log-sync.service'
import { SYNC_CONFIG } from '@modules/audit-log-sync/constants/sync.constant'
import { Logger } from '@common/logger'

@Injectable()
export class AuditLogTask {
  constructor(
    private readonly auditLogSyncService: AuditLogSyncService,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(AuditLogTask.name)
  }

  /** Cron: Incremental sync every 30 minutes */
  @Cron('*/30 * * * *')
  async handleIncrementalSync() {
    this.logger.log('Starting incremental sync...')
    try {
      await this.auditLogSyncService.runIncrementalSync()
      this.logger.log('Incremental sync completed successfully')
    } catch (error: any) {
      this.logger.error(
        'Cronjob failed to complete incremental sync',
        error.stack,
      )
    }
  }

  /** Cron: Full reconciliation at 2:00 AM every Sunday */
  @Cron('0 21 * * 0')
  async handleReconciliationSync() {
    this.logger.log('Starting full reconciliation sync...')
    try {
      await this.auditLogSyncService.runFullReconciliation()
      this.logger.log('Full reconciliation sync completed successfully')
    } catch (error: any) {
      this.logger.error(
        'Cronjob failed to complete reconciliation sync',
        error.stack,
      )
    }
  }
}
