import { InfrastructureException } from '@common/exceptions/infrastructure.exception'
import { HttpStatus } from '@nestjs/common'

export class SharepointApiException extends InfrastructureException {
  constructor(message: string, details?: Record<string, any>) {
    super(message, HttpStatus.BAD_GATEWAY, details)
  }
}
