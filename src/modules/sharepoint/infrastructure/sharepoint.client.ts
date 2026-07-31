import { Injectable } from '@nestjs/common'
import { HttpClientService } from 'src/common/http-client/http-client.service'
import { ConfigService } from '@nestjs/config'
import * as qs from 'qs'
import { SharepointAuthResponseDto } from './sharepoint-auth-response.dto'
import { SharepointConnectionModel } from './sharepoint-connection.model'
import { SharepointApiException } from './sharepoint-api.exception'
import { Logger } from 'src/common/logger/logger.service'

import { SharepointTokenCacheRepository } from '../repositories/sharepoint-token-cache.repository'

@Injectable()
export class SharepointClient {
  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    private readonly tokenCacheRepository: SharepointTokenCacheRepository,
  ) {
    this.logger.setContext(SharepointClient.name)
  }

  async authenticate(): Promise<SharepointConnectionModel> {
    const cachedToken = await this.tokenCacheRepository.getValidToken()
    if (cachedToken) {
      this.logger.debug('Using cached access token from database')
      return new SharepointConnectionModel('Success', cachedToken)
    }

    const tenantId = this.configService.get<string>('sharepoint.tenantId')
    const clientId = this.configService.get<string>('sharepoint.clientId')
    const clientSecret = this.configService.get<string>(
      'sharepoint.clientSecret',
    )

    if (!tenantId || !clientId || !clientSecret) {
      throw new SharepointApiException('Thiếu cấu hình Sharepoint API')
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    const payload = {
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://manage.office.com/.default',
      grant_type: 'client_credentials',
    }

    this.logger.debug(`Sending authentication request to: ${url}`)
    this.logger.debug(
      `Authentication payload: ${JSON.stringify({ ...payload, client_secret: '***MASKED***' })}`,
    )

    try {
      const data = await this.httpClient.post<SharepointAuthResponseDto>(
        url,
        qs.stringify(payload),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      )
      this.logger.debug(
        `Authentication successful. Received token (length: ${data.access_token.length})`,
      )

      await this.tokenCacheRepository.saveToken(data)

      return new SharepointConnectionModel('Success', data.access_token)
    } catch (error: any) {
      this.logger.error(
        `Authentication request failed. Error: ${error.message}`,
      )
      this.logger.error(
        `Failed authentication response payload: ${JSON.stringify(error.response?.data || {})}`,
      )
      throw new SharepointApiException(
        error.message,
        error.response?.data || error,
      )
    }
  }

  async startSubscription(
    token: string,
    contentType = 'Audit.SharePoint',
  ): Promise<any> {
    const tenantId = this.configService.get<string>('sharepoint.tenantId')
    const url = `https://manage.office.com/api/v1.0/${tenantId}/activity/feed/subscriptions/start?contentType=${contentType}`
    this.logger.debug(`Sending start subscription request to: ${url}`)
    return this.httpClient.post<any>(url, null, {
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  async listAvailableContent(
    token: string,
    contentType = 'Audit.SharePoint',
    startTime?: string,
    endTime?: string,
  ): Promise<any[]> {
    const tenantId = this.configService.get<string>('sharepoint.tenantId')
    let url = `https://manage.office.com/api/v1.0/${tenantId}/activity/feed/subscriptions/content?contentType=${contentType}`
    if (startTime && endTime) {
      url += `&startTime=${startTime}&endTime=${endTime}`
    }
    this.logger.debug(`Sending list available content request to: ${url}`)
    return this.httpClient.get<any[]>(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  async fetchContent(token: string, contentUri: string): Promise<any[]> {
    this.logger.debug(`Sending fetch content request to: ${contentUri}`)
    return this.httpClient.get<any[]>(contentUri, {
      headers: { Authorization: `Bearer ${token}` },
    })
  }
}
