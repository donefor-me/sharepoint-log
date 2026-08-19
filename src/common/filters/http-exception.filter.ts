import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common'
import { Response } from 'express'

import { ApiResponse } from '../interfaces/api-response.interface'
import { resolveErrorPayload } from './http-exception.util'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const { status, message, error } = resolveErrorPayload(exception)

    const errorBody: ApiResponse<null> = {
      message: Array.isArray(message) ? message[0] : message,
      error: JSON.stringify(error),
      timestamp: new Date().toISOString(),
    }

    const response = host.switchToHttp().getResponse<Response>()
    response.status(status).json(errorBody)
  }
}
