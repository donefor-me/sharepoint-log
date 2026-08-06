import { HttpClientModule } from '@common'
import { LoggerInterceptor, LoggerModule } from '@common'
import { TransformInterceptor } from '@common'
import { HttpExceptionFilter } from '@common'
import { CoreConfigModule } from '@config/config.module'
import { AuditLogSyncModule } from '@modules/audit-log-sync'
import { AuthModule } from '@modules/auth'
import { EncryptionModule } from '@modules/encryption/encryption.module'
import { SharepointModule } from '@modules/sharepoint'
import { SharepointDashboardModule } from '@modules/sharepoint-dashboard'
import { UsersModule } from '@modules/users'
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ZodValidationPipe } from 'nestjs-zod'

import { DatabaseModule } from './database/database.module'
import { TasksModule } from './tasks/tasks.module'

@Module({
  imports: [
    CoreConfigModule,
    DatabaseModule,
    HttpClientModule,
    SharepointModule,
    AuditLogSyncModule,
    UsersModule,
    AuthModule,
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
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
