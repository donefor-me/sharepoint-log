import { withRetry } from '@common/utils/http-retry.util'
import { EnvironmentVariables } from '@core/config/env.validation'
import { HttpClientService } from '@core/http-client/http-client.service'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as qs from 'qs'

import { SHAREPOINT_CONSTANTS } from './constants/sharepoint.constant'
import { SharepointAuthResponseDto } from './dto/sharepoint-auth-response.dto'
import {
  SharepointActivityDto,
  SharepointContentDto,
  SharepointSubscriptionDto,
} from './dto/sharepoint-management.dto'
import { TimeWindowDto } from './dto/time-window.dto'
import { SharepointApiException } from './exceptions/sharepoint-api.exception'
import { SharepointTokenCacheRepository } from './repositories/sharepoint-token-cache.repository'
@Injectable()
export class SharepointService {
  private readonly tenantId: string
  private readonly ALLOWED_API_PREFIX = 'https://manage.office.com/api/v1.0/'
  private readonly logger = new Logger(SharepointService.name)

  /**
   * Initializes the SharepointService, sets up logging context, and retrieves the tenantId from config.
   *
   * @param {HttpClientService} httpClient - The HTTP client used for external API requests.
   * @param {ConfigService} configService - The application configuration service.
   * @param {Logger} logger - The logger instance.
   * @param {SharepointTokenCacheRepository} tokenCacheRepository - Repository to retrieve and store the authentication token.
   * @returns {void}
   */
  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly tokenCacheRepository: SharepointTokenCacheRepository,
  ) {
    this.tenantId = this.configService.get('O365_TENANT_ID', { infer: true })!
  }

  /**
   * Retrieves a valid access token for the SharePoint API. It first checks the cache.
   * If a valid token is not found, it requests a new one using client credentials flow and caches it.
   *
   * @returns {Promise<string>} - A promise that resolves with the access token string.
   * @throws {SharepointApiException} - Thrown if configuration is missing or authentication fails.
   */
  private async getToken(): Promise<string> {
    const cachedToken = await this.tokenCacheRepository.getValidToken()
    if (cachedToken) return cachedToken

    const clientId = this.configService.get('O365_CLIENT_ID', { infer: true })!
    const clientSecret = this.configService.get('O365_CLIENT_SECRET', {
      infer: true,
    })!

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
        `[SharepointAPI:Auth] Authentication request failed | error="${error.message}"`,
      )
      throw new SharepointApiException(error.message)
    }
  }

  /**
   * Builds the fully qualified URL for Office 365 Management API calls.
   * Automatically appends the PublisherIdentifier to the query parameters.
   *
   * @param {string} path - The specific API path to append to the base URL.
   * @param {Record<string, string>} [queryParams={}] - Optional query parameters to include in the URL.
   * @returns {string} - The constructed API URL.
   */
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

  /**
   * Wrapper function to execute HTTP requests with automatic token injection.
   * Retrieves a token, attaches it as a Bearer authorization header, and performs the request.
   *
   * @param {'get' | 'post'} method - The HTTP method to use.
   * @param {string} url - The URL to send the request to.
   * @param {unknown} [body] - The request payload body (used for POST requests).
   * @returns {Promise<T>} - A promise that resolves with the strongly typed response data.
   * @throws {SharepointApiException} - Thrown if the HTTP request fails.
   */
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

  /**
   * Verifies the connection by attempting to retrieve a valid authentication token.
   *
   * @returns {Promise<{ status: string }>} - A promise that resolves to an object indicating connected status.
   */
  async checkConnection(): Promise<{ status: string }> {
    await this.getToken()
    return { status: 'connected' }
  }

  /**
   * Starts a new subscription for SharePoint activity logs on the Office 365 Management API.
   * If a subscription is already active, returns null without failing.
   *
   * @returns {Promise<SharepointSubscriptionDto | null>} - A promise resolving to the subscription info, or null if already active.
   * @throws {SharepointApiException} - Thrown if starting the subscription fails for reasons other than already being active.
   */
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

  /**
   * Retrieves the list of available SharePoint activity content blobs (metadata) for a given time window.
   *
   * @param {TimeWindowDto} [timeWindow] - The optional time window to filter the activity list by.
   * @returns {Promise<SharepointContentDto[]>} - A promise that resolves with an array of activity content metadata.
   */
  async listActivityContent(
    timeWindow?: TimeWindowDto,
  ): Promise<SharepointContentDto[]> {
    const contentType = SHAREPOINT_CONSTANTS.CONTENT_TYPE_AUDIT_SHAREPOINT
    const queryParams: Record<string, string> = { contentType }
    if (timeWindow?.startTime && timeWindow?.endTime) {
      queryParams.startTime = timeWindow.startTime
      queryParams.endTime = timeWindow.endTime
    }
    const url = this.buildApiUrl('subscriptions/content', queryParams)
    return this.authenticatedRequest<SharepointContentDto[]>('get', url)
  }

  /**
   * Fetches the detailed activity logs (content events) from a specific blob URI.
   * Enforces security by checking if the URI starts with the allowed API prefix.
   *
   * @param {string} contentUri - The URI pointing to the specific activity blob.
   * @returns {Promise<SharepointActivityDto[]>} - A promise that resolves with the detailed activity records.
   * @throws {SharepointApiException} - Thrown if the provided URI is invalid or the fetch request fails.
   */
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

  /**
   * Downloads raw data (like file content) from a URL using authenticated access.
   *
   * @param {string} url - The target URL to download from.
   * @returns {Promise<any>} - A promise that resolves with the raw response data.
   * @throws {SharepointApiException} - Thrown if the raw fetch request fails.
   */
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

  /**
   * Helper function to construct the URL for listing activity content blobs.
   * Merges content type and time window constraints.
   *
   * @param {TimeWindowDto} timeWindow - The window of time to constrain the list.
   * @param {string} [contentType=SHAREPOINT_CONSTANTS.CONTENT_TYPE_AUDIT_SHAREPOINT] - The content type for the audit log.
   * @returns {string} - The built API URL string for the list request.
   */
  buildListUri(
    timeWindow: TimeWindowDto,
    contentType: string = SHAREPOINT_CONSTANTS.CONTENT_TYPE_AUDIT_SHAREPOINT,
  ): string {
    return this.buildApiUrl('subscriptions/content', {
      contentType,
      ...(timeWindow.startTime && { startTime: timeWindow.startTime }),
      ...(timeWindow.endTime && { endTime: timeWindow.endTime }),
    })
  }

  /**
   * Fetches all activity logs using pagination and returns them as a flat array.
   *
   * @param {TimeWindowDto} timeWindow - The time window for the query.
   * @returns {Promise<SharepointContentDto[]>}
   */
  async fetchAllLogs(
    timeWindow: TimeWindowDto,
  ): Promise<SharepointContentDto[]> {
    let nextPageUrl: string | undefined = this.buildListUri(timeWindow)
    const allFiles: SharepointContentDto[] = []

    while (nextPageUrl) {
      const { data: files, headers } = await withRetry(() =>
        this.fetchRaw(nextPageUrl!),
      )

      const typedFiles = files as SharepointContentDto[]
      if (typedFiles && typedFiles.length > 0) {
        allFiles.push(...typedFiles)
      }

      nextPageUrl = headers['nextpageuri']
    }

    return allFiles
  }
}
