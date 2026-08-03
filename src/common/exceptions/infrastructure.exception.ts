import { HttpStatus } from '@nestjs/common'
import { AppException } from './app.exception'

export class InfrastructureException extends AppException {
  constructor(
    message: string,
    public readonly statusCode: HttpStatus = HttpStatus.BAD_GATEWAY,
  ) {
    super(message)
  }
}
