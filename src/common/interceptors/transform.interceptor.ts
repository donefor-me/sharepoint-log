import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator'
import { ApiResponse, MetaData } from '../interfaces/api-response.interface'

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private reflector: Reflector) {}

  /**
   * Intercepts successful responses and formats them into a standard API response structure.
   * It wraps the original data and includes HTTP status code and custom messages.
   *
   * @param {ExecutionContext} context - The execution context.
   * @param {CallHandler} next - The call handler to continue the execution flow.
   * @returns {Observable<ApiResponse<T>>} An observable that emits the formatted response.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const customMessage = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    )
    const message = customMessage || 'Success'

    return next.handle().pipe(
      map((res) => {
        if (
          res &&
          typeof res === 'object' &&
          ('data' in res || 'meta' in res)
        ) {
          return {
            message,
            data: res.data !== undefined ? res.data : null,
            ...(res.meta && { meta: res.meta as MetaData }),
          }
        }

        return {
          message,
          data: res,
        }
      }),
    )
  }
}
