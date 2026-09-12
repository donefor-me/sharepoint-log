import { SharepointIntegrationModule } from '@modules/sharepoint-integration/sharepoint-integration.module'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InfraDistributedLockModule } from '@platform/infra-distributed-lock/infra-distributed-lock.module'
import { InfraWatermarkModule } from '@platform/infra-watermark/infra-watermark.module'

import { AuditLog } from './entities/audit-log.entity'
import { AuditLogDlq } from './entities/audit-log-dlq.entity'
import { SharepointAuditLogQueryService } from './sharepoint-audit-log-query.service'
import { SharepointAuditLogSyncService } from './sharepoint-audit-log-sync.service'
import { SharepointAuditLogSyncTask } from './tasks/sharepoint-audit-log-sync.task'

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, AuditLogDlq]),
    SharepointIntegrationModule,
    InfraDistributedLockModule,
    InfraWatermarkModule,
  ],
  providers: [
    SharepointAuditLogQueryService,
    SharepointAuditLogSyncService,
    SharepointAuditLogSyncTask,
  ],
  exports: [SharepointAuditLogQueryService],
})
export class SharepointAuditLogSyncModule {}
