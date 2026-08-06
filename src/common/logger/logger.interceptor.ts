import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

import { Logger } from './logger.service'

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  /**
   * Intercepts incoming HTTP requests to log their start and end times,
   * along with the HTTP status code and total execution time.
   *
   * @param {ExecutionContext} context - The execution context providing details about the current request.
   * @param {CallHandler} next - The call handler to continue the execution flow.
   * @returns {Observable<any>} An observable representing the request response.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest()
    const { method, url } = req

    this.logger.log(`[START REQUEST] ${method} ${url}`, 'HTTP')
    const now = Date.now()

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse()
          const delay = Date.now() - now
          this.logger.log(
            `[END REQUEST] ${method} ${url} ${res.statusCode} - ${delay}ms`,
            'HTTP',
          )
        },
        error: (error) => {
          const statusCode = error.status || 500
          const delay = Date.now() - now
          this.logger.error(
            `[END REQUEST] ${method} ${url} ${statusCode} - ${delay}ms`,
            error.stack,
            'HTTP',
          )
        },
      }),
    )
  }
}
