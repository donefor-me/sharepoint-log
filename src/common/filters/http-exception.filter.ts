import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'

import { DomainException } from '../exceptions/domain.exception'
import { InfrastructureException } from '../exceptions/infrastructure.exception'
import { ApiResponse } from '../interfaces/api-response.interface'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    if (exception instanceof Error) {
      this.logger.error(
        `[Exception:Global] ${exception.message}`,
        exception.stack,
      )
    } else {
      this.logger.error(
        `[Exception:Global] Unknown error caught | details=${JSON.stringify(exception)}`,
      )
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
