import { EnvironmentVariables } from '@core/config/env.validation'
import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino'

import { getLoggerConfig } from './logger.config'

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) =>
        getLoggerConfig(configService),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
