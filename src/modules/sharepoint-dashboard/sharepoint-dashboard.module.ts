import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SharepointDashboardController } from './sharepoint-dashboard.controller'
import { SharepointDashboardService } from './sharepoint-dashboard.service'
import { AuditLog } from '../audit-log-sync/entities/audit-log.entity'
import { AuditLogSyncState } from '../audit-log-sync/entities/audit-log-sync-state.entity'

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, AuditLogSyncState])],
  controllers: [SharepointDashboardController],
  providers: [SharepointDashboardService],
})
export class SharepointDashboardModule {}
