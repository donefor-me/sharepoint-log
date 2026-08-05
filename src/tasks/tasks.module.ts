import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { AuditLogSyncModule } from '../modules/audit-log-sync/audit-log-sync.module'
import { AuditLogSyncTask } from './audit-log-sync.task'

@Module({
  imports: [ScheduleModule.forRoot(), AuditLogSyncModule],
  providers: [AuditLogSyncTask],
})
export class TasksModule {}
