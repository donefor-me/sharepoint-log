import { Injectable } from '@nestjs/common'
import { HttpClientService } from 'src/common/http-client/http-client.service'
import { ConfigService } from '@nestjs/config'
import * as qs from 'qs'
import { SharepointAuthResponseDto } from './sharepoint-auth-response.dto'
import { SharepointConnectionModel } from './sharepoint-connection.model'
import {
  SharepointSubscriptionDto,
  SharepointContentDto,
  SharepointActivityDto,
} from './sharepoint-management.dto'
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

  /**
   * Authenticates with SharePoint API via Azure AD.
   * Uses cached token if valid; otherwise, requests a new one using client credentials.
   *
   * @returns {Promise<SharepointConnectionModel>} An object containing the connection status and the access token.
   * @throws {SharepointApiException} If configuration is missing or authentication fails.
   */
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
      throw new SharepointApiException('Missing SharePoint API configuration')
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

  /**
   * Starts a subscription for the Office 365 Management Activity API.
   *
   * @param {string} token - The OAuth2 access token.
   * @param {string} [contentType='Audit.SharePoint'] - The type of content to subscribe to.
   * @returns {Promise<SharepointSubscriptionDto>} The subscription details.
   */
  async startSubscription(
    token: string,
    contentType = 'Audit.SharePoint',
  ): Promise<SharepointSubscriptionDto | null> {
    const tenantId = this.configService.get<string>('sharepoint.tenantId')
    const url = `https://manage.office.com/api/v1.0/${tenantId}/activity/feed/subscriptions/start?contentType=${contentType}&PublisherIdentifier=${tenantId}`
    this.logger.debug(`Sending start subscription request to: ${url}`)
    try {
      return await this.httpClient.post<SharepointSubscriptionDto>(url, null, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (error: any) {
      const msError = error.response?.data?.error

      if (
        msError &&
        (msError.code === 'AF20011' || msError.code === 'AF20024')
      ) {
        this.logger.log(
          `Subscription for ${contentType} is already active (Code: ${msError.code}). Skipping...`,
        )
        return null
      }

      this.logger.error(`Start subscription failed. Error: ${error.message}`)
      this.logger.error(
        `Start subscription response payload: ${JSON.stringify(error.response?.data || {})}`,
      )
      throw new SharepointApiException(
        error.message,
        error.response?.data || error,
      )
    }
  }

  /**
   * Lists available activity log content for a given subscription and content type.
   *
   * @param {string} token - The OAuth2 access token.
   * @param {string} [contentType='Audit.SharePoint'] - The content type to query.
   * @param {string} [startTime] - The start time for the query.
   * @param {string} [endTime] - The end time for the query.
   * @returns {Promise<SharepointContentDto[]>} An array of content metadata.
   */
  async listAvailableContent(
    token: string,
    contentType = 'Audit.SharePoint',
    startTime?: string,
    endTime?: string,
  ): Promise<SharepointContentDto[]> {
    const tenantId = this.configService.get<string>('sharepoint.tenantId')
    let url = `https://manage.office.com/api/v1.0/${tenantId}/activity/feed/subscriptions/content?contentType=${contentType}&PublisherIdentifier=${tenantId}`
    if (startTime && endTime) {
      url += `&startTime=${startTime}&endTime=${endTime}`
    }
    this.logger.debug(`Sending list available content request to: ${url}`)
    try {
      return await this.httpClient.get<SharepointContentDto[]>(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (error: any) {
      this.logger.error(
        `List available content failed. Error: ${error.message}`,
      )
      this.logger.error(
        `List available content response payload: ${JSON.stringify(error.response?.data || {})}`,
      )
      throw new SharepointApiException(
        error.message,
        error.response?.data || error,
      )
    }
  }

  /**
   * Fetches the actual activity log events from the provided content URI.
   *
   * @param {string} token - The OAuth2 access token.
   * @param {string} contentUri - The URI of the content to fetch.
   * @returns {Promise<SharepointActivityDto[]>} The array of activity events.
   */
  async fetchContent(
    token: string,
    contentUri: string,
  ): Promise<SharepointActivityDto[]> {
    this.logger.debug(`Sending fetch content request to: ${contentUri}`)
    try {
      return await this.httpClient.get<SharepointActivityDto[]>(contentUri, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (error: any) {
      this.logger.error(`Fetch content failed. Error: ${error.message}`)
      this.logger.error(
        `Fetch content response payload: ${JSON.stringify(error.response?.data || {})}`,
      )
      throw new SharepointApiException(
        error.message,
        error.response?.data || error,
      )
    }
  }
}
