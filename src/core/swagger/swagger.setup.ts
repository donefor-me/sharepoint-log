import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger'
import { cleanupOpenApiDoc } from 'nestjs-zod'

import { EnvironmentVariables } from '../config/env.validation'

export function setupSwagger(
  app: INestApplication,
  configService: ConfigService<EnvironmentVariables, true>,
): void {
  const isSwaggerEnabled = configService.get('ENABLE_SWAGGER', { infer: true })
  if (!isSwaggerEnabled) return

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SharePoint Log Dashboard API')
    .setDescription('API documentation for the SharePoint Log Dashboard')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)

  const cleanedDocument = cleanupOpenApiDoc(document)

  const customOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
    },
  }

  SwaggerModule.setup('api/docs', app, cleanedDocument, customOptions)
}
