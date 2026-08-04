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
  /**
   * Initializes the SharepointController with the required SharepointService.
   *
   * @param {SharepointService} sharepointService - The service handling SharePoint business logic and external API calls.
   * @returns {void}
   */
  constructor(private readonly sharepointService: SharepointService) {}

  @Get('check')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Connection checked successfully')
  /**
   * Endpoint to verify the connection status to the SharePoint API.
   *
   * @returns {Promise<{ status: string }>} - A promise that resolves with the connection status object.
   */
  async checkConnection() {
    return this.sharepointService.checkConnection()
  }

  @Post('subscription/start')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Subscription started successfully')
  /**
   * Endpoint to initiate a new activity subscription with SharePoint webhooks or event streams.
   *
   * @returns {Promise<SharepointSubscriptionDto | null>} - A promise that resolves with the subscription details or null if unsuccessful.
   */
  async startSubscription() {
    return this.sharepointService.startActivitySubscription()
  }

  @Get('subscription/content')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Content listed successfully')
  /**
   * Endpoint to list activity content from SharePoint, filtered by an optional time window.
   * Validates the query parameters against the TimeWindowSchema before processing.
   *
   * @param {any} query - The query parameters containing potential time window filters (e.g., startTime, endTime).
   * @returns {Promise<SharepointContentDto[]>} - A promise that resolves with an array of SharePoint content activities.
   * @throws {BadRequestException} - Thrown if the query parameters fail schema validation.
   */
  async listContent(@Query() query: any) {
    const parsed = TimeWindowSchema.safeParse(query)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors[0].message)
    }
    return this.sharepointService.listActivityContent(parsed.data)
  }
}
