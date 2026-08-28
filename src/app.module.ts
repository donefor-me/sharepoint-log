import { HttpExceptionFilter } from '@common/filters/http-exception.filter'
import { TransformInterceptor } from '@common/interceptors/transform.interceptor'
import { CoreConfigModule } from '@core/config/config.module'
import { DatabaseModule } from '@core/database/database.module'
import { HttpClientModule } from '@core/http-client/http-client.module'
import { LoggerModule } from '@core/logger/logger.module'
import { EncryptionModule } from '@modules/encryption/encryption.module'
import { SharepointAuditLogSyncModule } from '@modules/sharepoint-audit-log-sync/sharepoint-audit-log-sync.module'
import { SharepointDashboardModule } from '@modules/sharepoint-dashboard/sharepoint-dashboard.module'
import { SharepointIntegrationModule } from '@modules/sharepoint-integration/sharepoint-integration.module'
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { LoggerErrorInterceptor } from 'nestjs-pino'
import { ZodValidationPipe } from 'nestjs-zod'

@Module({
  imports: [
    CoreConfigModule,
    DatabaseModule,
    HttpClientModule,
    SharepointIntegrationModule,
    SharepointDashboardModule,
    SharepointAuditLogSyncModule,
    LoggerModule,
    EncryptionModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerErrorInterceptor,
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
