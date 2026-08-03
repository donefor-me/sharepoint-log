import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { CoreConfigModule } from './config/config.module'
import { DatabaseModule } from './database/database.module'
import { HttpClientModule } from './common/http-client/http-client.module'
import { SharepointModule } from './modules/sharepoint/sharepoint.module'
import { LoggerModule } from './common/logger/logger.module'
import { LoggerInterceptor } from './common/logger/logger.interceptor'
import { EncryptionModule } from './modules/encryption/encryption.module'

@Module({
  imports: [
    CoreConfigModule,
    DatabaseModule,
    HttpClientModule,
    SharepointModule,
    LoggerModule,
    EncryptionModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    },
  ],
})
export class AppModule {}
