import { HttpStatus } from '@nestjs/common'

import { AppException } from './app.exception'

export class InfrastructureException extends AppException {
  readonly logLevel = 'error' as const

  constructor(
    message: string,
    public readonly statusCode: HttpStatus = HttpStatus.BAD_GATEWAY,
  ) {
    super(message)
  }
}
