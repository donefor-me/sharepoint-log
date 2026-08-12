import { Global, Module } from '@nestjs/common'
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino'

import { loggerConfig } from './logger.config'

@Global()
@Module({
  imports: [PinoLoggerModule.forRoot(loggerConfig)],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
