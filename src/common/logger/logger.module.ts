import { Global, Module } from '@nestjs/common'
import { Logger } from './logger.service'
import { LoggerInterceptor } from './logger.interceptor'

@Global()
@Module({
  providers: [Logger, LoggerInterceptor],
  exports: [Logger, LoggerInterceptor],
})
export class LoggerModule {}
