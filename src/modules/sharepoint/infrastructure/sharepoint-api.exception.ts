import { HttpException, HttpStatus } from '@nestjs/common'

export class SharepointApiException extends HttpException {
  constructor(message: string, rawError?: any) {
    super(
      {
        message: 'Lỗi giao tiếp với API Sharepoint',
        error: message,
        details: rawError,
      },
      HttpStatus.BAD_GATEWAY,
    )
  }
}
