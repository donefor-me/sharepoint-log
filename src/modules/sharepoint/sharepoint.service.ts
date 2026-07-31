import { Injectable } from '@nestjs/common'
import { SharepointClient } from './infrastructure/sharepoint.client'
import { SharepointConnectionModel } from './infrastructure/sharepoint-connection.model'
import { Logger } from 'src/common/logger/logger.service'

@Injectable()
export class SharepointService {
  constructor(
    private readonly sharepointClient: SharepointClient,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(SharepointService.name)
  }

  async checkConnection(): Promise<SharepointConnectionModel> {
    this.logger.log('Initiating SharePoint connection check...')
    return this.sharepointClient.authenticate()
  }

  async startActivitySubscription(): Promise<any> {
    this.logger.log(
      'Starting Office 365 Management Activity API subscription...',
    )
    const auth = await this.sharepointClient.authenticate()
    return this.sharepointClient.startSubscription(
      auth.token!,
      'Audit.SharePoint',
    )
  }

  async listActivityContent(
    startTime?: string,
    endTime?: string,
  ): Promise<any[]> {
    this.logger.log('Fetching list of available content from Office 365...')
    const auth = await this.sharepointClient.authenticate()
    return this.sharepointClient.listAvailableContent(
      auth.token!,
      'Audit.SharePoint',
      startTime,
      endTime,
    )
  }

  async fetchActivityContent(contentUri: string): Promise<any[]> {
    this.logger.log(`Downloading activity log content from URI: ${contentUri}`)
    const auth = await this.sharepointClient.authenticate()
    return this.sharepointClient.fetchContent(auth.token!, contentUri)
  }
}
