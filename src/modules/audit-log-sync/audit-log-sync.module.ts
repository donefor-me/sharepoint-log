import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SharepointModule } from '../sharepoint/sharepoint.module'
import { AuditLogSyncService } from './audit-log-sync.service'
import { AuditLog } from './entities/audit-log.entity'
import { AuditLogDlq } from './entities/audit-log-dlq.entity'
import { AuditLogSyncState } from './entities/audit-log-sync-state.entity'
import { AuditLogRepository } from './repositories/audit-log.repository'
import { SyncLockService } from './sync-lock.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, AuditLogSyncState, AuditLogDlq]),
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
