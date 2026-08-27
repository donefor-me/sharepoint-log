import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SharepointIntegrationModule } from '../sharepoint-integration/sharepoint-integration.module'
import { SharepointAuditLogQueryService } from './sharepoint-audit-log-query.service'
import { SharepointAuditLogSyncService } from './sharepoint-audit-log-sync.service'
import { AuditLog } from './entities/audit-log.entity'
import { AuditLogDlq } from './entities/audit-log-dlq.entity'
import { AuditLogSyncState } from './entities/audit-log-sync-state.entity'
import { AuditLogRepository } from './repositories/audit-log.repository'
import { SyncLockService } from './sync-lock.service'
import { SharepointAuditLogSyncTask } from './tasks/sharepoint-audit-log-sync.task'

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, AuditLogSyncState, AuditLogDlq]),
    SharepointIntegrationModule,
  ],
  providers: [
    SharepointAuditLogQueryService,
    SharepointAuditLogSyncService,
    SyncLockService,
    AuditLogRepository,
    SharepointAuditLogSyncTask,
  ],
  exports: [SharepointAuditLogQueryService],
})
export class SharepointAuditLogSyncModule {}
