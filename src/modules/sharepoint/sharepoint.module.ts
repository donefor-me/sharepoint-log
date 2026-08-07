import { Module } from '@nestjs/common'

import { SharepointDashboardModule } from './dashboard/sharepoint-dashboard.module'
import { SharepointIntegrationModule } from './integration/sharepoint-integration.module'

@Module({
  imports: [SharepointIntegrationModule, SharepointDashboardModule],
  exports: [SharepointIntegrationModule, SharepointDashboardModule],
})
export class SharepointModule {}
