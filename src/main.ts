import { EnvironmentVariables } from '@core/config/env.validation'
import { Logger as NestLogger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { Logger } from 'nestjs-pino'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  app.useLogger(app.get(Logger))
  const logger = new NestLogger('Bootstrap')

  app.use(helmet())

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
