import { Module } from '@nestjs/common'

import { AuditLogSyncModule } from './audit-log-sync/audit-log-sync.module'
import { SharepointDashboardModule } from './dashboard/sharepoint-dashboard.module'
import { SharepointIntegrationModule } from './integration/sharepoint-integration.module'

@Module({
  imports: [
    SharepointIntegrationModule,
    SharepointDashboardModule,
    AuditLogSyncModule,
  ],
  exports: [
    SharepointIntegrationModule,
    SharepointDashboardModule,
    AuditLogSyncModule,
  ],
})
export class SharepointModule {}
