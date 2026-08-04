import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpClientService } from '@common/http-client'
import * as qs from 'qs'
import { SharepointAuthResponseDto } from './dto/sharepoint-auth-response.dto'
import {
  SharepointSubscriptionDto,
  SharepointContentDto,
  SharepointActivityDto,
} from './dto/sharepoint-management.dto'
import { SharepointApiException } from '@common/exceptions'
import { Logger } from '@common/logger'
import { SHAREPOINT_CONSTANTS } from './constants/sharepoint.constant'
import { SharepointTokenCacheRepository } from './repositories/sharepoint-token-cache.repository'

@Injectable()
export class SharepointService {
  private readonly tenantId: string
  private readonly ALLOWED_API_PREFIX = 'https://manage.office.com/api/v1.0/'

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    private readonly tokenCacheRepository: SharepointTokenCacheRepository,
  ) {
    this.logger.setContext(SharepointService.name)
    this.tenantId = this.configService.getOrThrow<string>('sharepoint.tenantId')
  }

  private async getToken(): Promise<string> {
    const cachedToken = await this.tokenCacheRepository.getValidToken()
    if (cachedToken) return cachedToken

    const clientId = this.configService.get<string>('sharepoint.clientId')
    const clientSecret = this.configService.get<string>(
      'sharepoint.clientSecret',
    )

    if (!clientId || !clientSecret) {
      throw new SharepointApiException('Missing SharePoint API configuration')
    }

    const url = `${SHAREPOINT_CONSTANTS.AUTH_BASE_URL}/${this.tenantId}/oauth2/v2.0/token`
    const payload = {
      client_id: clientId,
      client_secret: clientSecret,
      scope: SHAREPOINT_CONSTANTS.AUTH_SCOPE,
      grant_type: 'client_credentials',
    }

    try {
      const data = await this.httpClient.post<SharepointAuthResponseDto>(
        url,
        qs.stringify(payload),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      )
      await this.tokenCacheRepository.saveToken(data)
      return data.access_token
    } catch (error: any) {
      this.logger.error(
        `Authentication request failed. Error: ${error.message}`,
      )
      throw new SharepointApiException(error.message)
    }
  }

  private buildApiUrl(
    path: string,
    queryParams: Record<string, string> = {},
  ): string {
    const base = `${SHAREPOINT_CONSTANTS.API_BASE_URL}/${this.tenantId}/activity/feed/${path}`
    const params = new URLSearchParams({
      PublisherIdentifier: this.tenantId,
      ...queryParams,
    })
    return `${base}?${params.toString()}`
  }

  private async authenticatedRequest<T>(
    method: 'get' | 'post',
    url: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.getToken()
    const headers = { Authorization: `Bearer ${token}` }
    try {
      return method === 'get'
        ? await this.httpClient.get<T>(url, { headers })
        : await this.httpClient.post<T>(url, body, { headers })
    } catch (error: any) {
      throw new SharepointApiException(error.message)
    }
  }

  async checkConnection(): Promise<{ status: string }> {
    await this.getToken()
    return { status: 'connected' }
  }

  async startActivitySubscription(): Promise<SharepointSubscriptionDto | null> {
    const token = await this.getToken()
    const contentType = SHAREPOINT_CONSTANTS.CONTENT_TYPE_AUDIT_SHAREPOINT
    const url = this.buildApiUrl('subscriptions/start', { contentType })
    try {
      return await this.httpClient.post<SharepointSubscriptionDto>(url, null, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (error: any) {
      const msErrorCode = error.response?.data?.error?.code
      if (
        SHAREPOINT_CONSTANTS.SUBSCRIPTION_ALREADY_ACTIVE_CODES.includes(
          msErrorCode,
        )
      ) {
        return null
      }
      throw new SharepointApiException(error.message)
    }
  }

  async listActivityContent(
    startTime?: string,
    endTime?: string,
  ): Promise<SharepointContentDto[]> {
    const contentType = SHAREPOINT_CONSTANTS.CONTENT_TYPE_AUDIT_SHAREPOINT
    const queryParams: Record<string, string> = { contentType }
    if (startTime && endTime) {
      queryParams.startTime = startTime
      queryParams.endTime = endTime
    }
    const url = this.buildApiUrl('subscriptions/content', queryParams)
    return this.authenticatedRequest<SharepointContentDto[]>('get', url)
  }

  async fetchActivityContent(
    contentUri: string,
  ): Promise<SharepointActivityDto[]> {
    if (!contentUri.startsWith(this.ALLOWED_API_PREFIX)) {
      throw new SharepointApiException(
        'Invalid contentUri: must be an Office 365 Management API URL',
      )
    }
    return this.authenticatedRequest<SharepointActivityDto[]>('get', contentUri)
  }

  async fetchRaw(url: string): Promise<any> {
    const token = await this.getToken()
    try {
      return await this.httpClient.getRaw(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (error: any) {
      throw new SharepointApiException(error.message)
    }
  }

  buildListUri(
    startTime: string,
    endTime: string,
    contentType = SHAREPOINT_CONSTANTS.CONTENT_TYPE_AUDIT_SHAREPOINT,
  ): string {
    return this.buildApiUrl('subscriptions/content', {
      contentType,
      startTime,
      endTime,
    })
  }
}
