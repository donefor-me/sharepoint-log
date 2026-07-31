import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ApiResponse, MetaData } from '../interfaces/api-response.interface'
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator'

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private reflector: Reflector) {}

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
        const statusCode = context.switchToHttp().getResponse().statusCode

        // Check if the response already has a meta field (e.g., from a paginated service)
        if (
          res &&
          typeof res === 'object' &&
          ('data' in res || 'meta' in res)
        ) {
          return {
            statusCode,
            message,
            data: res.data !== undefined ? res.data : null,
            ...(res.meta && { meta: res.meta as MetaData }),
          }
        }

        // Standard wrapping for raw data
        return {
          statusCode,
          message,
          data: res,
        }
      }),
    )
  }
}
