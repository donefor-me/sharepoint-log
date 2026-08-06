import { HttpStatus } from '@nestjs/common'

import { InfrastructureException } from './infrastructure.exception'

export class SharepointApiException extends InfrastructureException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_GATEWAY)
  }
}
