import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SharepointIntegrationModule } from '../integration/sharepoint-integration.module'
import { AuditLogQueryService } from './audit-log-query.service'
import { AuditLogSyncService } from './audit-log-sync.service'
import { AuditLog } from './entities/audit-log.entity'
import { AuditLogDlq } from './entities/audit-log-dlq.entity'
import { AuditLogSyncState } from './entities/audit-log-sync-state.entity'
import { AuditLogRepository } from './repositories/audit-log.repository'
import { SyncLockService } from './sync-lock.service'
import { AuditLogSyncTask } from './tasks/audit-log-sync.task'

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, AuditLogSyncState, AuditLogDlq]),
    SharepointIntegrationModule,
  ],
  providers: [
    AuditLogQueryService,
    AuditLogSyncService,
    SyncLockService,
    AuditLogRepository,
    AuditLogSyncTask,
  ],
  exports: [
    TypeOrmModule,
    AuditLogQueryService,
    AuditLogSyncService,
    SyncLockService,
    SharepointIntegrationModule,
  ],
})
export class AuditLogSyncModule {}
