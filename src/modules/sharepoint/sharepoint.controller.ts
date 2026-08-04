import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common'
import { SharepointService } from './sharepoint.service'
import { ResponseMessage } from '@common/decorators'
import { TimeWindowSchema } from '@common/dto/time-window.dto'

@Controller('api/sharepoint')
export class SharepointController {
  constructor(private readonly sharepointService: SharepointService) {}

  @Get('check')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Connection checked successfully')
  async checkConnection() {
    return this.sharepointService.checkConnection()
  }

  @Post('subscription/start')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Subscription started successfully')
  async startSubscription() {
    return this.sharepointService.startActivitySubscription()
  }

  @Get('subscription/content')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Content listed successfully')
  async listContent(@Query() query: any) {
    const parsed = TimeWindowSchema.safeParse(query)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors[0].message)
    }
    return this.sharepointService.listActivityContent(parsed.data)
  }
}
