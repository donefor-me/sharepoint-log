/* eslint-disable @typescript-eslint/unbound-method */
import { HttpClientService } from '@core/http-client/http-client.service'
import { SHAREPOINT_CONSTANTS } from '@modules/sharepoint-integration/constants/sharepoint.constant'
import { SharepointApiException } from '@modules/sharepoint-integration/exceptions/sharepoint-api.exception'
import { SharepointTokenCacheRepository } from '@modules/sharepoint-integration/repositories/sharepoint-token-cache.repository'
import { SharepointIntegrationService } from '@modules/sharepoint-integration/sharepoint-integration.service'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'

describe('SharepointIntegrationService (Edge Cases)', () => {
  let service: SharepointIntegrationService
  let httpClient: jest.Mocked<HttpClientService>
  let configService: jest.Mocked<ConfigService>
  let tokenCacheRepository: jest.Mocked<SharepointTokenCacheRepository>

  beforeEach(async () => {
    httpClient = {
      get: jest.fn(),
      post: jest.fn(),
      getRaw: jest.fn(),
    } as any

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'O365_TENANT_ID') return 'test-tenant'
        if (key === 'O365_CLIENT_ID') return 'test-client'
        if (key === 'O365_CLIENT_SECRET') return 'test-secret'
        return null
      }),
    } as any

    tokenCacheRepository = {
      getValidToken: jest.fn().mockResolvedValue('test-token'),
      saveToken: jest.fn().mockResolvedValue(undefined),
    } as any

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharepointIntegrationService,
        { provide: HttpClientService, useValue: httpClient },
        { provide: ConfigService, useValue: configService },
        {
          provide: SharepointTokenCacheRepository,
          useValue: tokenCacheRepository,
        },
      ],
    }).compile()

    service = module.get<SharepointIntegrationService>(
      SharepointIntegrationService,
    )
  })

  it('should throw SharepointApiException on 429 Too Many Requests in authenticatedRequest', async () => {
    httpClient.get.mockRejectedValue({
      response: {
        status: 429,
        data: { error: 'Too Many Requests' },
      },
      message: 'Request failed with status code 429',
    })

    await expect(service.listActivityContent()).rejects.toThrow(
      SharepointApiException,
    )
  })

  it('should throw SharepointApiException on 500 Internal Error in authenticatedRequest', async () => {
    httpClient.get.mockRejectedValue({
      response: {
        status: 500,
        data: { error: 'Internal Server Error' },
      },
      message: 'Request failed with status code 500',
    })

    await expect(service.listActivityContent()).rejects.toThrow(
      SharepointApiException,
    )
  })

  it('should throw SharepointApiException on invalid contentUri (not starting with ALLOWED_API_PREFIX)', async () => {
    const invalidUri =
      'https://malicious.com/api/v1.0/test-tenant/activity/feed/content'
    await expect(service.fetchActivityContent(invalidUri)).rejects.toThrow(
      SharepointApiException,
    )
  })

  it('should handle token fetch failure (e.g., 401 Unauthorized)', async () => {
    tokenCacheRepository.getValidToken.mockResolvedValue(null)
    httpClient.post.mockRejectedValue({
      response: {
        status: 401,
        data: { error: 'invalid_client' },
      },
      message: 'Request failed with status code 401',
    })

    await expect(service.checkConnection()).rejects.toThrow(
      SharepointApiException,
    )
  })

  it('should return null if subscription is already active (starts with already active code)', async () => {
    httpClient.post.mockRejectedValue({
      response: {
        data: {
          error: {
            code: SHAREPOINT_CONSTANTS.SUBSCRIPTION_ALREADY_ACTIVE_CODES[0],
          },
        },
      },
    })

    const result = await service.startActivitySubscription()
    expect(result).toBeNull()
  })

  it('should loop while nextPageUrl is present and aggregate results', async () => {
    httpClient.getRaw
      .mockResolvedValueOnce({
        data: [{ contentUri: 'uri-1' }],
        headers: { nextpageuri: 'http://next.com/page2' },
      } as any)
      .mockResolvedValueOnce({
        data: [{ contentUri: 'uri-2' }],
        headers: {}, // no next page
      } as any)

    const result = await service.fetchAllLogs({
      startTime: '2026-09-01T00:00:00Z',
      endTime: '2026-09-02T00:00:00Z',
    })

    expect(result.length).toBe(2)
    expect(httpClient.getRaw).toHaveBeenCalledTimes(2)
  })

  it('should throw immediately if HTTP 401 occurs mid-pagination', async () => {
    httpClient.getRaw
      .mockResolvedValueOnce({
        data: [{ contentUri: 'uri-1' }],
        headers: { nextpageuri: 'http://next.com/page2' },
      } as any)
      .mockRejectedValueOnce({
        message: 'Request failed with status code 401',
        response: { status: 401, data: 'Unauthorized' },
      })

    await expect(
      service.fetchAllLogs({
        startTime: '2026-09-01T00:00:00Z',
        endTime: '2026-09-02T00:00:00Z',
      } as any),
    ).rejects.toThrow(SharepointApiException)

    expect(httpClient.getRaw).toHaveBeenCalledTimes(2)
  })
})
