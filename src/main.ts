import { EnvironmentVariables } from '@core/config/env.validation'
import { setupSwagger } from '@core/swagger/swagger.setup'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { Logger } from 'nestjs-pino'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  const configService =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService)

  const logger = app.get(Logger)
  app.useLogger(logger)

  setupSwagger(app, configService)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", '://cloudflare.com'],
          styleSrc: ["'self'", "'unsafe-inline'", '://cloudflare.com'],
          imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
          connectSrc: ["'self'", 'validator.swagger.io'],
        },
      },
    }),
  )

  app.enableCors({
    origin: configService.get('CORS_ORIGIN', { infer: true }),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  })

  const port = configService.get('PORT', { infer: true })
  await app.listen(port)

  logger.log(`Swagger available at: ${await app.getUrl()}/api/docs`)
  logger.log(`Application is running at: ${await app.getUrl()}`)
}
bootstrap().catch((err) => console.error(err))
