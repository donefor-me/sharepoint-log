import { HttpException, HttpStatus } from '@nestjs/common'

export class SharepointApiException extends HttpException {
  constructor(message: string, rawError?: any) {
    super(
      {
        message: 'SharePoint API communication error',
        error: message,
        details: rawError,
      },
      HttpStatus.BAD_GATEWAY,
    )
  }
}
