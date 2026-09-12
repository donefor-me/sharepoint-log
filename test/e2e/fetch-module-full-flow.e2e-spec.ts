/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/require-await */
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import { HttpClientModule } from '../../src/core/http-client/http-client.module'
import { HttpClientService } from '../../src/core/http-client/http-client.service'
import { EncryptionService } from '../../src/modules/encryption/encryption.service'
import { AuditLogDlqStatus } from '../../src/modules/sharepoint-audit-log-sync/constants/dlq-status.constant'
import { AuditLog } from '../../src/modules/sharepoint-audit-log-sync/entities/audit-log.entity'
import { AuditLogDlq } from '../../src/modules/sharepoint-audit-log-sync/entities/audit-log-dlq.entity'
import { SharepointAuditLogSyncModule } from '../../src/modules/sharepoint-audit-log-sync/sharepoint-audit-log-sync.module'
import { SharepointAuditLogSyncTask } from '../../src/modules/sharepoint-audit-log-sync/tasks/sharepoint-audit-log-sync.task'
import { SharepointTokenCache } from '../../src/modules/sharepoint-integration/entities/sharepoint-token-cache.entity'
import { InfraWatermark } from '../../src/platform/infra-watermark/entities/infra-watermark.entity'
import { TestDatabaseModule } from '../utils/test-database.module'

describe('Fetch Module Full Flow (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let syncTask: SharepointAuditLogSyncTask

  let auditLogRepo: Repository<AuditLog>
  let dlqRepo: Repository<AuditLogDlq>
  let watermarkRepo: Repository<InfraWatermark>
  let tokenCacheRepo: Repository<SharepointTokenCache>

  let mockHttpClient: jest.Mocked<HttpClientService>

  beforeAll(async () => {
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      getRaw: jest.fn(),
    } as any

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TestDatabaseModule,
        SharepointAuditLogSyncModule,
        HttpClientModule,
      ],
    })
      .overrideProvider(HttpClientService)
      .useValue(mockHttpClient)
      .overrideProvider(EncryptionService)
      .useValue({
        encrypt: jest.fn((t: string) => `enc_${t}`),
        decrypt: jest.fn((t: string) => t.replace('enc_', '')),
      })
      .compile()

    app = moduleFixture.createNestApplication({ logger: false })
    await app.init()

    dataSource = moduleFixture.get<DataSource>(DataSource)
    await dataSource.synchronize(true)

    syncTask = moduleFixture.get<SharepointAuditLogSyncTask>(
      SharepointAuditLogSyncTask,
    )

    auditLogRepo = moduleFixture.get<Repository<AuditLog>>(
      getRepositoryToken(AuditLog),
    )
    dlqRepo = moduleFixture.get<Repository<AuditLogDlq>>(
      getRepositoryToken(AuditLogDlq),
    )
    watermarkRepo = moduleFixture.get<Repository<InfraWatermark>>(
      getRepositoryToken(InfraWatermark),
    )
    tokenCacheRepo = moduleFixture.get<Repository<SharepointTokenCache>>(
      getRepositoryToken(SharepointTokenCache),
    )
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  beforeEach(async () => {
    jest.clearAllMocks()
    await auditLogRepo.clear()
    await dlqRepo.clear()
    await watermarkRepo.clear()
    await tokenCacheRepo.clear()
  })

  it('Scenario 1: Happy Path - Full Sync Flow with Pagination', async () => {
    // 1. Mock Token fetch
    mockHttpClient.post.mockResolvedValue({
      access_token: 'fake-token-123',
      token_type: 'Bearer',
      expires_in: 3600,
    })

    // 2. Mock Fetch Activity List with Pagination (2 pages)
    mockHttpClient.getRaw
      .mockResolvedValueOnce({
        data: [
          {
            contentUri: 'https://manage.office.com/api/v1.0/blob-1',
            contentId: 'blob-1',
          },
        ],
        headers: { nextpageuri: 'https://manage.office.com/api/v1.0/page-2' },
      } as any)
      .mockResolvedValue({
        data: [
          {
            contentUri: 'https://manage.office.com/api/v1.0/blob-2',
            contentId: 'blob-2',
          },
        ],
        headers: {}, // No nextpageuri
      } as any)

    // 3. Mock Fetch Blob Content (called from processPendingLogs)
    mockHttpClient.get.mockImplementation(async (url: string) => {
      if (url.includes('blob-1')) {
        return [
          {
            Id: 'event-1',
            CreationTime: '2026-09-01T00:00:00Z',
            Operation: 'Op1',
            Workload: 'WL',
            UserId: 'user1',
            ObjectId: 'obj1',
            ItemName: 'item1',
          },
        ]
      }
      if (url.includes('blob-2')) {
        return [
          {
            Id: 'event-2',
            CreationTime: '2026-09-02T00:00:00Z',
            Operation: 'Op2',
            Workload: 'WL',
            UserId: 'user2',
            ObjectId: 'obj2',
            ItemName: 'item2',
          },
        ]
      }
      return []
    })

    // Execute the full flow
    await syncTask.handleForwardSync()

    // Verify DB states
    // A. Token must be cached
    const tokenCache = await tokenCacheRepo.find()
    expect(tokenCache.length).toBe(1)

    // B. Pagination was traversed correctly
    expect(mockHttpClient.getRaw).toHaveBeenCalledTimes(2)

    // C. DLQ processed both files and marked them DONE
    const dlqRecords = await dlqRepo.find()
    expect(dlqRecords.length).toBe(2)
    expect(dlqRecords.every((r) => r.status === AuditLogDlqStatus.DONE)).toBe(
      true,
    )

    // D. Audit logs were extracted and saved
    const auditLogs = await auditLogRepo.find()
    expect(auditLogs.length).toBe(2)
    const operations = auditLogs.map((l) => l.operation).sort()
    expect(operations).toEqual(['Op1', 'Op2'])

    // E. Watermark progressed
    const watermark = await watermarkRepo.find()
    expect(watermark.length).toBe(1)
    expect(watermark[0].timestampValue).toBeDefined()
  })

  it('Scenario 2: Partial Data Failure (Microsoft API partially down)', async () => {
    // 1. Mock Token fetch
    mockHttpClient.post.mockResolvedValue({
      access_token: 'fake-token-123',
      token_type: 'Bearer',
      expires_in: 3600,
    })

    // 2. Mock Fetch Activity List (1 page, 2 blobs)
    mockHttpClient.getRaw.mockResolvedValue({
      data: [
        {
          contentUri: 'https://manage.office.com/api/v1.0/blob-good',
          contentId: 'blob-good',
        },
        {
          contentUri: 'https://manage.office.com/api/v1.0/blob-bad',
          contentId: 'blob-bad',
        },
      ],
      headers: {},
    } as any)

    // 3. Mock Fetch Blob Content (1 success, 1 failure)
    mockHttpClient.get.mockImplementation(async (url: string) => {
      if (url.includes('blob-good')) {
        return [
          {
            Id: 'event-good',
            CreationTime: '2026-09-01T00:00:00Z',
            Operation: 'Op1',
            Workload: 'WL',
            UserId: 'user1',
            ObjectId: 'obj',
            ItemName: 'item',
          },
        ]
      }
      if (url.includes('blob-bad')) {
        // Throw HTTP error simulating 500
        const error = new Error('Request failed with status code 500') as any
        error.response = { status: 500 }
        throw error
      }
      return []
    })

    // Execute the full flow
    await syncTask.handleForwardSync()

    // Verify DB states
    // The good blob is DONE, the bad blob is PENDING and has retryCount = 1
    const dlqGood = await dlqRepo.findOneBy({ contentId: 'blob-good' })
    expect(dlqGood?.status).toBe(AuditLogDlqStatus.DONE)

    const dlqBad = await dlqRepo.findOneBy({ contentId: 'blob-bad' })
    expect(dlqBad?.status).toBe(AuditLogDlqStatus.PENDING)
    expect(dlqBad?.retryCount).toBe(1)

    // Only the good audit log was stored
    const auditLogs = await auditLogRepo.find()
    expect(auditLogs.length).toBe(1)
    expect(auditLogs[0].microsoftId).toBe('event-good')
  })
})
