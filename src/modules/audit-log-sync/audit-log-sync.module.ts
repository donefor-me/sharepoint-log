import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SharepointModule } from '../sharepoint/sharepoint.module'
import { AuditLog } from './entities/audit-log.entity'
import { AuditLogContentBlob } from './entities/audit-log-content-blob.entity'
import { AuditLogSyncState } from './entities/audit-log-sync-state.entity'
import { AuditLogSyncService } from './audit-log-sync.service'
import { SyncLockService } from './sync-lock.service'
import { AuditLogRepository } from './repositories/audit-log.repository'
import { AuditLogBlobRepository } from './repositories/audit-log-blob.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      AuditLogContentBlob,
      AuditLogSyncState,
    ]),
    SharepointModule,
  ],
  providers: [
    AuditLogSyncService,
    SyncLockService,
    AuditLogRepository,
    AuditLogBlobRepository,
  ],
  exports: [
    TypeOrmModule,
    AuditLogSyncService,
    SyncLockService,
    SharepointModule,
  ],
})
export class AuditLogSyncModule {}
