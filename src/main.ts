import { EnvironmentVariables } from '@core/config/env.validation'
import { Logger } from '@core/logger/logger.service'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  const logger = await app.resolve(Logger)
  app.useLogger(logger)
  logger.setContext('Bootstrap')

  const configService =
    app.get<ConfigService<EnvironmentVariables>>(ConfigService)

  app.enableCors({
    origin: configService.getOrThrow('CORS_ORIGIN'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  })

  const port = configService.getOrThrow('PORT')
  await app.listen(port)

  logger.log(`Application is running on: ${await app.getUrl()}`)
}
bootstrap().catch((err) => console.error(err))
