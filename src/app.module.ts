import { HttpExceptionFilter } from '@common/filters/http-exception.filter'
import { TransformInterceptor } from '@common/interceptors/transform.interceptor'
import { CoreConfigModule } from '@core/config/config.module'
import { DatabaseModule } from '@core/database/database.module'
import { HttpClientModule } from '@core/http-client/http-client.module'
import { LoggerInterceptor } from '@core/logger/logger.interceptor'
import { LoggerModule } from '@core/logger/logger.module'
import { AuthModule } from '@modules/auth/auth.module'
import { EncryptionModule } from '@modules/encryption/encryption.module'
import { AuditLogSyncModule } from '@modules/sharepoint/audit-log-sync/audit-log-sync.module'
import { SharepointModule } from '@modules/sharepoint/sharepoint.module'
import { UsersModule } from '@modules/users/users.module'
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ZodValidationPipe } from 'nestjs-zod'

@Module({
  imports: [
    CoreConfigModule,
    DatabaseModule,
    HttpClientModule,
    SharepointModule,
    AuditLogSyncModule,
    UsersModule,
    AuthModule,
    LoggerModule,
    EncryptionModule,
    ScheduleModule.forRoot(),
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
