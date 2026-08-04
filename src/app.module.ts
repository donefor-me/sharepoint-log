import { Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ZodValidationPipe } from 'nestjs-zod'
import { CoreConfigModule } from '@config/config.module'
import { DatabaseModule } from './database/database.module'
import { HttpClientModule } from '@common'
import { SharepointModule } from '@modules/sharepoint'
import { AuditLogSyncModule } from '@modules/audit-log-sync'
import { UsersModule } from '@modules/users'
import { AuthModule } from '@modules/auth'
import { SharepointDashboardModule } from '@modules/sharepoint-dashboard'
import { LoggerModule, LoggerInterceptor } from '@common'
import { EncryptionModule } from '@modules/encryption/encryption.module'
import { TasksModule } from './tasks/tasks.module'
import { TransformInterceptor } from '@common'
import { HttpExceptionFilter } from '@common'

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
