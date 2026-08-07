import { Module } from '@nestjs/common'

import { AuditLogSyncModule } from '../audit-log-sync/audit-log-sync.module'
import { SharepointDashboardController } from './sharepoint-dashboard.controller'
import { SharepointDashboardService } from './sharepoint-dashboard.service'

@Module({
  imports: [AuditLogSyncModule],
  controllers: [SharepointDashboardController],
  providers: [SharepointDashboardService],
})
export class SharepointDashboardModule {}
