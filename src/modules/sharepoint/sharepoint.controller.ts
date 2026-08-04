import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common'
import { SharepointService } from './sharepoint.service'
import { ResponseMessage } from '@common/decorators'

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
  async listContent(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.sharepointService.listActivityContent(startTime, endTime)
  }
}
