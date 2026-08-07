import { InfrastructureException } from '@common/exceptions/infrastructure.exception'
import { HttpStatus } from '@nestjs/common'

export class SharepointApiException extends InfrastructureException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_GATEWAY)
  }
}
