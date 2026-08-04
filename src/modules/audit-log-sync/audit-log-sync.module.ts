import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SharepointModule } from '../sharepoint/sharepoint.module'
import { AuditLog } from './entities/audit-log.entity'
import { AuditLogSyncState } from './entities/audit-log-sync-state.entity'
import { AuditLogSyncService } from './audit-log-sync.service'
import { SyncLockService } from './sync-lock.service'
import { AuditLogRepository } from './repositories/audit-log.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, AuditLogSyncState]),
    SharepointModule,
  ],
  providers: [AuditLogSyncService, SyncLockService, AuditLogRepository],
  exports: [
    TypeOrmModule,
    AuditLogSyncService,
    SyncLockService,
    SharepointModule,
  ],
})
export class AuditLogSyncModule {}
