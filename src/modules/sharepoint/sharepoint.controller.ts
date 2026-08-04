import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common'
import { SharepointService } from './sharepoint.service'
import { ResponseMessage } from '@common'
import { TimeWindowDto } from './dto/time-window.dto'

@Controller('api/sharepoint')
export class SharepointController {
  /**
   * Initializes the SharepointController with the required SharepointService.
   *
   * @param {SharepointService} sharepointService - The service handling SharePoint business logic and external API calls.
   * @returns {void}
   */
  constructor(private readonly sharepointService: SharepointService) {}

  /**
   * Endpoint to verify the connection status to the SharePoint API.
   *
   * @returns {Promise<{ status: string }>} - A promise that resolves with the connection status object.
   */
  @Get('check')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Connection checked successfully')
  async checkConnection() {
    return this.sharepointService.checkConnection()
  }

  /**
   * Endpoint to initiate a new activity subscription with SharePoint webhooks or event streams.
   *
   * @returns {Promise<SharepointSubscriptionDto | null>} - A promise that resolves with the subscription details or null if unsuccessful.
   */
  @Post('subscription/start')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Subscription started successfully')
  async startSubscription() {
    return this.sharepointService.startActivitySubscription()
  }

  /**
   * Endpoint to list activity content from SharePoint, filtered by an optional time window.
   * Validates the query parameters against the TimeWindowSchema before processing.
   *
   * @param {any} query - The query parameters containing potential time window filters (e.g., startTime, endTime).
   * @returns {Promise<SharepointContentDto[]>} - A promise that resolves with an array of SharePoint content activities.
   * @throws {BadRequestException} - Thrown if the query parameters fail schema validation.
   */
  @Get('subscription/content')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Content listed successfully')
  async listContent(@Query() query: TimeWindowDto) {
    return this.sharepointService.listActivityContent(query)
  }
}
