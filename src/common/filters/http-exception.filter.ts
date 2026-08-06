import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'

import { DomainException } from '../exceptions/domain.exception'
import { InfrastructureException } from '../exceptions/infrastructure.exception'
import { ApiResponse } from '../interfaces/api-response.interface'
import { Logger } from '../logger/logger.service'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {
    this.logger.setContext(HttpExceptionFilter.name)
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    // Log all exceptions with stack trace for observability
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack)
    } else {
      this.logger.error('Unknown exception caught', JSON.stringify(exception))
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal Server Error'
    let error: string | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || 'Error'
      error =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).error
          : undefined
    } else if (exception instanceof InfrastructureException) {
      status = exception.statusCode
      message = exception.message
      error = exception.name
    } else if (exception instanceof DomainException) {
      status = HttpStatus.UNPROCESSABLE_ENTITY
      message = exception.message
      error = exception.name
    }

    const errorBody: ApiResponse<null> = {
      message: Array.isArray(message) ? message[0] : message,
      error,
      timestamp: new Date().toISOString(),
    }

    response.status(status).json(errorBody)
  }
}
