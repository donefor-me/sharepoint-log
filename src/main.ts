import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@common/logger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  const logger = await app.resolve(Logger)
  app.useLogger(logger)
  logger.setContext('Bootstrap')

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  })

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  logger.log(`Application is running on: ${await app.getUrl()}`)
}
bootstrap().catch((err) => console.error(err))
