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
