import { Global, Module } from '@nestjs/common'

import { LoggerInterceptor } from './logger.interceptor'
import { Logger } from './logger.service'

@Global()
@Module({
  providers: [Logger, LoggerInterceptor],
  exports: [Logger, LoggerInterceptor],
})
export class LoggerModule {}
