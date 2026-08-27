import { Module } from '@nestjs/common'

import { SharepointAuditLogSyncModule } from '../sharepoint-audit-log-sync/sharepoint-audit-log-sync.module'
import { SharepointDashboardController } from './sharepoint-dashboard.controller'
import { SharepointDashboardService } from './sharepoint-dashboard.service'

@Module({
  imports: [SharepointAuditLogSyncModule],
  controllers: [SharepointDashboardController],
  providers: [SharepointDashboardService],
})
export class SharepointDashboardModule {}
