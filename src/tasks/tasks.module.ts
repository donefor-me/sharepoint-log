import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { AuditLogSyncModule } from '../modules/audit-log-sync/audit-log-sync.module'
import { AuditLogTask } from './audit-log.task'

@Module({
  imports: [ScheduleModule.forRoot(), AuditLogSyncModule],
  providers: [AuditLogTask],
})
export class TasksModule {}
