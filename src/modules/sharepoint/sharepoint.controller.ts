import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Query,
  Body,
} from '@nestjs/common'
import { SharepointService } from './sharepoint.service'
import { ResponseMessage } from '../../common/decorators/response-message.decorator'

@Controller('api/sharepoint')
export class SharepointController {
  constructor(private readonly sharepointService: SharepointService) {}

  /**
   * Endpoint to verify the SharePoint connection.
   *
   * @returns {Promise<SharepointConnectionModel>} The current connection status and token.
   */
  @Get('check')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Connection checked successfully')
  async checkConnection() {
    return this.sharepointService.checkConnection()
  }

  /**
   * Endpoint to start an Office 365 Management Activity API subscription.
   *
   * @returns {Promise<SharepointSubscriptionDto>} The subscription response data.
   */
  @Post('subscription/start')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Subscription started successfully')
  async startSubscription() {
    return this.sharepointService.startActivitySubscription()
  }

  /**
   * Endpoint to list available activity content.
   *
   * @param {string} [startTime] - Optional start time filter.
   * @param {string} [endTime] - Optional end time filter.
   * @returns {Promise<SharepointContentDto[]>} List of available content metadata.
   */
  @Get('subscription/content')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Content listed successfully')
  async listContent(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.sharepointService.listActivityContent(startTime, endTime)
  }

  /**
   * Endpoint to fetch actual activity log events from a specific content URI.
   *
   * @param {string} contentUri - The URI of the content blob to fetch.
   * @returns {Promise<SharepointActivityDto[]>} Detailed activity logs.
   */
  @Post('subscription/fetch')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Content fetched successfully')
  async fetchContent(@Body('contentUri') contentUri: string) {
    return this.sharepointService.fetchActivityContent(contentUri)
  }
}
