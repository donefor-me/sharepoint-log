import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'
import { ApiResponse } from '../interfaces/api-response.interface'
import { DomainException } from '../exceptions/domain.exception'
import { InfrastructureException } from '../exceptions/infrastructure.exception'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * Catches exceptions thrown across the application and formats the error response.
   * Translates NestJS HttpExceptions and unhandled errors into a consistent JSON structure.
   *
   * @param {unknown} exception - The exception that was thrown.
   * @param {ArgumentsHost} host - The arguments host containing the execution context.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

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
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      error,
      timestamp: new Date().toISOString(),
    }

    response.status(status).json(errorBody)
  }
}
