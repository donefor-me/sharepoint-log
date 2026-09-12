import { AuditLogDlqStatus } from '@modules/sharepoint-audit-log-sync/constants/dlq-status.constant'
import { SYNC_CONFIG } from '@modules/sharepoint-audit-log-sync/constants/sync.constant'
import { AuditLogDlq } from '@modules/sharepoint-audit-log-sync/entities/audit-log-dlq.entity'
import { SharepointAuditLogSyncModule } from '@modules/sharepoint-audit-log-sync/sharepoint-audit-log-sync.module'
import { SharepointAuditLogSyncService } from '@modules/sharepoint-audit-log-sync/sharepoint-audit-log-sync.service'
import { SharepointIntegrationService } from '@modules/sharepoint-integration/sharepoint-integration.service'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'

import { TestDatabaseModule } from '../utils/test-database.module'

describe('SharepointAuditLogSyncService (Integration)', () => {
  let app: INestApplication
  let service: SharepointAuditLogSyncService
  let sharepointIntegrationService: jest.Mocked<SharepointIntegrationService>
  let dataSource: DataSource

  beforeAll(async () => {
    sharepointIntegrationService = {
      fetchActivityContent: jest.fn(),
    } as any

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestDatabaseModule, SharepointAuditLogSyncModule],
    })
      .overrideProvider(SharepointIntegrationService)
      .useValue(sharepointIntegrationService)
      .compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    service = moduleFixture.get<SharepointAuditLogSyncService>(
      SharepointAuditLogSyncService,
    )
    dataSource = moduleFixture.get<DataSource>(DataSource)

    await dataSource.synchronize(true)
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  beforeEach(async () => {
    await dataSource.getRepository(AuditLogDlq).clear()
    jest.clearAllMocks()
  })

  it('should insert files to DLQ and ignore duplicates using orIgnore', async () => {
    const files = [
      {
        contentUri: 'uri1',
        contentId: 'id1',
        contentType: 'type',
        contentCreated: 'date',
        contentExpiration: 'date',
      },
      {
        contentUri: 'uri2',
        contentId: 'id2',
        contentType: 'type',
        contentCreated: 'date',
        contentExpiration: 'date',
      },
    ]

    await service.insertToDlq(files)

    // Insert again to test orIgnore
    await service.insertToDlq(files)

    const count = await dataSource.getRepository(AuditLogDlq).count()
    expect(count).toBe(2)
  })

  it('should process pending logs and mark them as DONE', async () => {
    await dataSource.getRepository(AuditLogDlq).save({
      contentUri: 'uri1',
      contentId: 'id1',
      retryCount: 0,
      status: AuditLogDlqStatus.PENDING,
    })

    sharepointIntegrationService.fetchActivityContent.mockResolvedValue([
      {
        Id: '1',
        CreationTime: '2026-09-01T00:00:00Z',
        Operation: 'Op',
        Workload: 'WL',
        UserId: 'user',
        ObjectId: 'obj',
        ItemName: 'item',
      } as any,
    ])

    const result = await service.processPendingLogs()

    expect(result.failed).toBe(0)
    const dlq = await dataSource
      .getRepository(AuditLogDlq)
      .findOneBy({ contentUri: 'uri1' })
    expect(dlq?.status).toBe(AuditLogDlqStatus.DONE)
  })

  it('should increment retryCount and eventually move to DLQ status', async () => {
    await dataSource.getRepository(AuditLogDlq).save({
      contentUri: 'uri1',
      contentId: 'id1',
      retryCount: SYNC_CONFIG.MAX_RETRY_PER_ID - 1,
      status: AuditLogDlqStatus.PENDING,
    })

    sharepointIntegrationService.fetchActivityContent.mockRejectedValue(
      new Error('Network error'),
    )

    const result = await service.processPendingLogs()

    expect(result.failed).toBe(1)
    const dlq = await dataSource
      .getRepository(AuditLogDlq)
      .findOneBy({ contentUri: 'uri1' })
    expect(dlq?.status).toBe(AuditLogDlqStatus.DLQ)
    expect(dlq?.retryCount).toBe(SYNC_CONFIG.MAX_RETRY_PER_ID)
  })
})
