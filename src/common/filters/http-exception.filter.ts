import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'
import { ApiResponse } from '../interfaces/api-response.interface'

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

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal Server Error' }

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || 'Error'

    const errorBody: ApiResponse<null> = {
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      error:
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).error
          : 'Internal Server Error',
      timestamp: new Date().toISOString(),
    }

    response.status(status).json(errorBody)
  }
}
