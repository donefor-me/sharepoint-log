import { AuditLog } from '@modules/sharepoint-audit-log-sync/entities/audit-log.entity'
import { SharepointAuditLogQueryService } from '@modules/sharepoint-audit-log-sync/sharepoint-audit-log-query.service'
import { SharepointAuditLogSyncModule } from '@modules/sharepoint-audit-log-sync/sharepoint-audit-log-sync.module'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'

import { HttpClientModule } from '../../src/core/http-client/http-client.module'
import { TestDatabaseModule } from '../utils/test-database.module'

describe('SharepointAuditLogQueryService (Integration)', () => {
  let app: INestApplication
  let service: SharepointAuditLogQueryService
  let dataSource: DataSource

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TestDatabaseModule,
        SharepointAuditLogSyncModule,
        HttpClientModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    service = moduleFixture.get<SharepointAuditLogQueryService>(
      SharepointAuditLogQueryService,
    )
    dataSource = moduleFixture.get<DataSource>(DataSource)

    await dataSource.synchronize(true)

    const repo = dataSource.getRepository(AuditLog)
    await repo.save([
      {
        microsoftId: 'uuid-1',
        contentId: 'blob-1',
        creationTime: new Date('2026-09-01T10:00:00Z'),
        operation: 'FileUploaded',
        workload: 'SharePoint',
        userId: 'alice@test.com',
        objectId: 'https://test.com/file1.docx',
        itemName: 'file1.docx',
        rawData: {},
      },
      {
        microsoftId: 'uuid-2',
        contentId: 'blob-2',
        creationTime: new Date('2026-09-02T10:00:00Z'),
        operation: 'FileDownloaded',
        workload: 'SharePoint',
        userId: 'bob@test.com',
        objectId: 'https://test.com/secret_report.pdf',
        itemName: 'secret_report.pdf',
        rawData: {},
      },
    ])
  })

  afterAll(async () => {
    if (dataSource) await dataSource.destroy()
    if (app) await app.close()
  })

  it('should search using ILIKE for fileName (case-insensitive on both itemName and objectId)', async () => {
    const [logs, count] = await service.queryLogs({
      page: 1,
      limit: 10,
      fileName: 'SECRET',
    })

    expect(count).toBe(1)
    expect(logs[0].userId).toBe('bob@test.com')
  })

  it('should search using ILIKE for userName', async () => {
    const [logs, count] = await service.queryLogs({
      page: 1,
      limit: 10,
      userName: 'ALICE',
    })

    expect(count).toBe(1)
    expect(logs[0].userId).toBe('alice@test.com')
  })

  it('should handle pagination correctly (page / limit)', async () => {
    const [logs, count] = await service.queryLogs({
      page: 1,
      limit: 1,
    })

    expect(count).toBe(2)
    expect(logs.length).toBe(1)
    expect(logs[0].userId).toBe('bob@test.com')

    const [logs2, count2] = await service.queryLogs({
      page: 2,
      limit: 1,
    })
    expect(count2).toBe(2)
    expect(logs2.length).toBe(1)
    expect(logs2[0].userId).toBe('alice@test.com')
  })
})
