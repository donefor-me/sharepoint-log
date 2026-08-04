import { Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { CoreConfigModule } from '@config/config.module'
import { DatabaseModule } from './database/database.module'
import { HttpClientModule } from '@common/http-client'
import { SharepointModule } from '@modules/sharepoint/sharepoint.module'
import { AuditLogSyncModule } from '@modules/audit-log-sync/audit-log-sync.module'
import { SharepointDashboardModule } from '@modules/sharepoint-dashboard'
import { LoggerModule, LoggerInterceptor } from '@common/logger'
import { EncryptionModule } from '@modules/encryption/encryption.module'
import { TasksModule } from './tasks/tasks.module'
import { TransformInterceptor } from '@common/interceptors'
import { HttpExceptionFilter } from '@common/filters'

@Module({
  imports: [
    CoreConfigModule,
    DatabaseModule,
    HttpClientModule,
    SharepointModule,
    AuditLogSyncModule,
    SharepointDashboardModule,
    LoggerModule,
    EncryptionModule,
    TasksModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
