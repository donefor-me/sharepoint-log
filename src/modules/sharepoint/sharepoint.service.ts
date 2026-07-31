import { Injectable } from '@nestjs/common'
import { SharepointClient } from './infrastructure/sharepoint.client'
import { SharepointConnectionModel } from './infrastructure/sharepoint-connection.model'
import {
  SharepointSubscriptionDto,
  SharepointContentDto,
  SharepointActivityDto,
} from './infrastructure/sharepoint-management.dto'
import { Logger } from 'src/common/logger/logger.service'

@Injectable()
export class SharepointService {
  constructor(
    private readonly sharepointClient: SharepointClient,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(SharepointService.name)
  }

  /**
   * Checks the SharePoint API connection by performing an authentication request.
   *
   * @returns {Promise<SharepointConnectionModel>} The connection status and token.
   */
  async checkConnection(): Promise<SharepointConnectionModel> {
    this.logger.log('Initiating SharePoint connection check...')
    return this.sharepointClient.authenticate()
  }

  /**
   * Initiates a new subscription to retrieve Audit.SharePoint logs.
   * Automatically handles authentication before making the client request.
   *
   * @returns {Promise<SharepointSubscriptionDto>} Details of the created subscription.
   */
  async startActivitySubscription(): Promise<SharepointSubscriptionDto | null> {
    this.logger.log(
      'Starting Office 365 Management Activity API subscription...',
    )
    const auth = await this.sharepointClient.authenticate()
    return this.sharepointClient.startSubscription(
      auth.token!,
      'Audit.SharePoint',
    )
  }

  /**
   * Lists available activity content from Office 365 Management Activity API.
   * Optionally filters by start and end times.
   *
   * @param {string} [startTime] - The start time for filtering content (ISO 8601).
   * @param {string} [endTime] - The end time for filtering content (ISO 8601).
   * @returns {Promise<SharepointContentDto[]>} An array of available content metadata.
   */
  async listActivityContent(
    startTime?: string,
    endTime?: string,
  ): Promise<SharepointContentDto[]> {
    this.logger.log('Fetching list of available content from Office 365...')
    const auth = await this.sharepointClient.authenticate()
    return this.sharepointClient.listAvailableContent(
      auth.token!,
      'Audit.SharePoint',
      startTime,
      endTime,
    )
  }

  /**
   * Fetches the actual activity log content using a provided content URI.
   *
   * @param {string} contentUri - The URI of the content blob to fetch.
   * @returns {Promise<SharepointActivityDto[]>} An array of detailed SharePoint activities.
   */
  async fetchActivityContent(
    contentUri: string,
  ): Promise<SharepointActivityDto[]> {
    this.logger.log(`Downloading activity log content from URI: ${contentUri}`)
    const auth = await this.sharepointClient.authenticate()
    return this.sharepointClient.fetchContent(auth.token!, contentUri)
  }
}
