import { NestFactory, Reflector } from '@nestjs/core'
import { AppModule } from './app.module'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { Logger } from './common/logger/logger.service'

/**
 * Bootstraps the NestJS application.
 * Initializes the app, configures global pipes/filters, and starts listening on the configured port.
 *
 * @returns {Promise<void>}
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  const logger = await app.resolve(Logger)
  app.useLogger(logger)
  logger.setContext('Bootstrap')

  const reflector = app.get(Reflector)
  app.useGlobalInterceptors(new TransformInterceptor(reflector))
  app.useGlobalFilters(new HttpExceptionFilter())

  // Enable CORS for frontend
  app.enableCors({
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  })

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  logger.log(`Application is running on: ${await app.getUrl()}`)
}
bootstrap().catch((err) => console.error(err))
