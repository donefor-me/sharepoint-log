import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { randomUUID } from 'crypto'
import { DataSource, Repository } from 'typeorm'

import { LoggerModule } from '../src/core/logger/logger.module'
import { EncryptionService } from '../src/modules/encryption/encryption.service'
import { AuditLogSyncModule } from '../src/modules/sharepoint/audit-log-sync/audit-log-sync.module'
import { AuditLogSyncService } from '../src/modules/sharepoint/audit-log-sync/audit-log-sync.service'
import { AuditLogDlqStatus } from '../src/modules/sharepoint/audit-log-sync/constants/dlq-status.constant'
import { SYNC_CONFIG } from '../src/modules/sharepoint/audit-log-sync/constants/sync.constant'
import { AuditLog } from '../src/modules/sharepoint/audit-log-sync/entities/audit-log.entity'
import { AuditLogDlq } from '../src/modules/sharepoint/audit-log-sync/entities/audit-log-dlq.entity'
import { AuditLogSyncState } from '../src/modules/sharepoint/audit-log-sync/entities/audit-log-sync-state.entity'
import { SyncLockService } from '../src/modules/sharepoint/audit-log-sync/sync-lock.service'
import { AuditLogSyncTask } from '../src/modules/sharepoint/audit-log-sync/tasks/audit-log-sync.task'
import { SharepointService } from '../src/modules/sharepoint/integration/sharepoint.service'
import { TestDatabaseModule } from './utils/test-database.module'

describe('AuditLogSync Workflow (e2e)', () => {
  let dataSource: DataSource
  let moduleFixture: TestingModule
  let syncTask: AuditLogSyncTask
  let syncService: AuditLogSyncService
  let syncStateRepo: Repository<AuditLogSyncState>
  let auditLogRepo: Repository<AuditLog>
  let dlqRepo: Repository<AuditLogDlq>

  const mockSharepointService = {
    fetchAllLogs: jest.fn(),
    fetchActivityContent: jest.fn(),
  }

  const mockSyncLockService = {
    acquire: jest.fn().mockResolvedValue(true),
    renewLock: jest.fn().mockResolvedValue(true),
    release: jest.fn(),
  }

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setContext: jest.fn(),
    debug: jest.fn(),
  }

  const createMockActivity = (
    _uri: string,
    operation = 'MockOp',
    date = new Date(),
  ) => ({
    Id: randomUUID(),
    CreationTime: date.toISOString(),
    Operation: operation,
    Workload: 'SharePoint',
    UserId: 'user',
    ObjectId: 'obj',
    ItemName: 'item',
  })

  const makeDlqEntry = (overrides: Partial<AuditLogDlq> = {}) => ({
    contentUri: 'uri_x',
    contentId: 'id_x',
    retryCount: 0,
    status: AuditLogDlqStatus.PENDING,
    ...overrides,
  })

  async function resetDb() {
    await syncStateRepo.clear()
    await auditLogRepo.clear()
    await dlqRepo.clear()
  }

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [LoggerModule, TestDatabaseModule, AuditLogSyncModule],
    })
      .overrideProvider(SharepointService)
      .useValue(mockSharepointService)
      .overrideProvider(EncryptionService)
      .useValue({ encrypt: jest.fn(), decrypt: jest.fn() })
      .overrideProvider(SyncLockService)
      .useValue(mockSyncLockService)
      .overrideProvider(Logger)
      .useValue(mockLogger)
      .compile()

    syncTask = moduleFixture.get<AuditLogSyncTask>(AuditLogSyncTask)
    syncService = moduleFixture.get<AuditLogSyncService>(AuditLogSyncService)
    syncStateRepo = moduleFixture.get<Repository<AuditLogSyncState>>(
      getRepositoryToken(AuditLogSyncState),
    )
    auditLogRepo = moduleFixture.get<Repository<AuditLog>>(
      getRepositoryToken(AuditLog),
    )
    dlqRepo = moduleFixture.get<Repository<AuditLogDlq>>(
      getRepositoryToken(AuditLogDlq),
    )

    dataSource = moduleFixture.get<DataSource>(DataSource)
    await dataSource.runMigrations()
  })

  afterAll(async () => {
    if (moduleFixture) {
      await moduleFixture.close()
    }
  })

  beforeEach(async () => {
    jest.clearAllMocks()
    mockSyncLockService.acquire.mockResolvedValue(true)
    mockSyncLockService.renewLock.mockResolvedValue(true)
    await resetDb()
  })

  describe('Group 1: Forward Sync', () => {
    it('FS-01: Watermark Catchup - Watermark tiến chuẩn 1 ngày đến khi chạm safeNow', async () => {
      mockSharepointService.fetchAllLogs.mockResolvedValue([])
      mockSharepointService.fetchActivityContent.mockResolvedValue([])

      const ONE_DAY_MS = 24 * 60 * 60 * 1000
      let lastWatermarkMs = 0
      for (let i = 0; i < 7; i++) {
        await syncTask.handleForwardSync()

        expect(mockSharepointService.fetchAllLogs).toHaveBeenNthCalledWith(
          i + 1,
          expect.objectContaining({ startTime: expect.any(String) }),
        )

        const state = await syncStateRepo.findOne({
          where: { key: SYNC_CONFIG.STATE_WATERMARK_KEY },
        })
        const currentWatermarkMs = state!.value!.getTime()
        if (lastWatermarkMs !== 0) {
          if (i < 6)
            expect(currentWatermarkMs - lastWatermarkMs).toBe(ONE_DAY_MS)
          else expect(currentWatermarkMs - lastWatermarkMs).toBeGreaterThan(0)
        }
        lastWatermarkMs = currentWatermarkMs
      }
    })

    it('FS-02: Edge Case Không có log nào - Vẫn tiến watermark bình thường', async () => {
      mockSharepointService.fetchAllLogs.mockResolvedValue([])
      await syncTask.handleForwardSync()
      const state = await syncStateRepo.findOne({
        where: { key: SYNC_CONFIG.STATE_WATERMARK_KEY },
      })
      expect(state).toBeDefined()
    })

    it('FS-03 & FS-04: Xử lý khối lượng dữ liệu siêu lớn (Massive logs > chunk size)', async () => {
      const originalChunkSize = SYNC_CONFIG.DB_INSERT_CHUNK_SIZE
      const originalConcurrency = SYNC_CONFIG.CONCURRENT_DOWNLOADS
      jest.replaceProperty(SYNC_CONFIG as any, 'DB_INSERT_CHUNK_SIZE', 500)
      jest.replaceProperty(SYNC_CONFIG as any, 'CONCURRENT_DOWNLOADS', 1)

      try {
        const mockLargeData = Array.from({ length: 750 }).map((_, i) => ({
          contentUri: `uri_${i}`,
          contentId: `id_${i}`,
        }))
        mockSharepointService.fetchAllLogs.mockResolvedValue(mockLargeData)
        mockSharepointService.fetchActivityContent.mockImplementation((uri) =>
          Promise.resolve([createMockActivity(uri)]),
        )

        await syncTask.handleForwardSync()

        const dlqCount = await dlqRepo.count()
        expect(dlqCount).toBe(750)

        const auditCount = await auditLogRepo.count()
        expect(auditCount).toBe(750)

        const testRecord = await auditLogRepo.findOne({
          where: { contentId: 'id_0' },
        })
        expect(testRecord).toBeDefined()
      } finally {
        jest.replaceProperty(
          SYNC_CONFIG,
          'DB_INSERT_CHUNK_SIZE',
          originalChunkSize,
        )
        jest.replaceProperty(
          SYNC_CONFIG,
          'CONCURRENT_DOWNLOADS',
          originalConcurrency,
        )
      }
    })
  })

  describe('Group 2 & 4: Reconciliation, Idempotency & Deduplication', () => {
    it('RS-01, RS-02 & IDP-02: Bắt trễ 100% nhưng bypass 99% data cũ', async () => {
      await dlqRepo.save(
        makeDlqEntry({
          contentUri: 'uri_old',
          contentId: 'id_old',
          status: AuditLogDlqStatus.DONE,
        }),
      )
      await auditLogRepo.save({
        microsoftId: '00000000-0000-0000-0000-000000000001',
        contentId: 'id_old',
        creationTime: new Date().toISOString(),
        operation: 'OldOp',
        workload: 'SharePoint',
        rawData: {},
      })

      mockSharepointService.fetchAllLogs.mockResolvedValue([
        { contentUri: 'uri_old', contentId: 'id_old' },
        { contentUri: 'uri_delayed', contentId: 'id_delayed' },
      ])

      let fetchCallCount = 0
      mockSharepointService.fetchActivityContent.mockImplementation((uri) => {
        fetchCallCount++
        return Promise.resolve([createMockActivity(uri)])
      })

      const saveSpy = jest.spyOn(dlqRepo, 'save')

      await syncTask.handleReconciliationSync()

      expect(fetchCallCount).toBe(1)

      const logs = await auditLogRepo.find()
      expect(logs.length).toBe(2)

      const delayedLog = logs.find((l) => l.contentId === 'id_delayed')
      expect(delayedLog).toBeDefined()
      expect(delayedLog!.operation).toBe('MockOp')

      const callsWithUriOld = saveSpy.mock.calls.filter((args) =>
        Array.isArray(args[0])
          ? args[0].some((item) => item.contentUri === 'uri_old')
          : args[0].contentUri === 'uri_old',
      )
      expect(callsWithUriOld.length).toBe(0)
      saveSpy.mockRestore()
    })

    it('RS-03: Boundary vượt quá 7 ngày - Không fetch', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick'] })
      const fakeNow = new Date('2026-08-05T12:00:00Z')
      jest.setSystemTime(fakeNow)

      try {
        mockSharepointService.fetchAllLogs.mockResolvedValue([])
        await syncTask.handleReconciliationSync()

        expect(mockSharepointService.fetchAllLogs).toHaveBeenCalled()
        const calls = mockSharepointService.fetchAllLogs.mock.calls
        const firstCallArgs = calls[0]

        const expectedTime =
          fakeNow.getTime() -
          SYNC_CONFIG.RECONCILIATION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000 -
          SYNC_CONFIG.ZERO_LAG_MINUTES * 60 * 1000
        const actualTime = new Date(firstCallArgs[0].startTime).getTime()
        expect(actualTime).toEqual(expectedTime)
      } finally {
        jest.useRealTimers()
      }
    })
  })

  describe('Group 3: Error Handling & DLQ', () => {
    it('ERR-01: API Detail Fail - Log vào DLQ với status PENDING và tăng retry', async () => {
      mockSharepointService.fetchAllLogs.mockResolvedValue([
        { contentUri: 'uri_err', contentId: 'id_err' },
      ])
      mockSharepointService.fetchActivityContent.mockRejectedValueOnce(
        new Error('Network Timeout'),
      )

      await syncTask.handleForwardSync()

      const dlqErr = await dlqRepo.findOne({ where: { contentUri: 'uri_err' } })
      expect(dlqErr!.status).toBe(AuditLogDlqStatus.PENDING)
      expect(dlqErr!.retryCount).toBe(1)
      expect(dlqErr!.errorReason).toContain('Network Timeout')

      const auditCount = await auditLogRepo.count({
        where: { contentId: 'id_err' },
      })
      expect(auditCount).toBe(0)
    })

    it('ERR-02: Max Retry Threshold - Khóa vĩnh viễn FAILED', async () => {
      mockSharepointService.fetchAllLogs.mockResolvedValue([
        { contentUri: 'uri_fail', contentId: 'id_fail' },
      ])
      mockSharepointService.fetchActivityContent.mockRejectedValue(
        new Error('Fatal Error'),
      )

      for (let i = 0; i < SYNC_CONFIG.MAX_RETRY_PER_ID + 1; i++) {
        await syncTask.handleForwardSync()
      }

      const dlqFail = await dlqRepo.findOne({
        where: { contentUri: 'uri_fail' },
      })
      expect(dlqFail!.retryCount).toBe(SYNC_CONFIG.MAX_RETRY_PER_ID)
      expect(dlqFail!.status).toBe(AuditLogDlqStatus.DLQ)

      const fetchCalls =
        mockSharepointService.fetchActivityContent.mock.calls.length
      expect(fetchCalls).toBe(SYNC_CONFIG.MAX_RETRY_PER_ID)
    })

    it('ERR-03: Partial Failures - Ghi DB một phần thành công, phần lỗi kẹt lại', async () => {
      mockSharepointService.fetchAllLogs.mockResolvedValue([
        { contentUri: 'uri_good', contentId: 'id_good' },
        { contentUri: 'uri_bad', contentId: 'id_bad' },
      ])

      mockSharepointService.fetchActivityContent.mockImplementation((uri) => {
        if (uri === 'uri_good')
          return Promise.resolve([createMockActivity(uri, 'GoodOp')])
        return Promise.reject(new Error('Bad Format'))
      })

      await syncTask.handleForwardSync()

      const dlqGood = await dlqRepo.findOne({
        where: { contentUri: 'uri_good' },
      })
      expect(dlqGood!.status).toBe(AuditLogDlqStatus.DONE)

      const dlqBad = await dlqRepo.findOne({ where: { contentUri: 'uri_bad' } })
      expect(dlqBad!.status).toBe(AuditLogDlqStatus.PENDING)
      expect(dlqBad!.retryCount).toBe(1)

      expect(await auditLogRepo.count()).toBe(1)
    })

    it('ERR-04: Happy Path Recovery - Xử lý bản ghi PENDING thành DONE', async () => {
      await dlqRepo.save(
        makeDlqEntry({ contentUri: 'uri_recovery', contentId: 'id_recovery' }),
      )

      mockSharepointService.fetchActivityContent.mockImplementation((uri) => {
        return Promise.resolve([createMockActivity(uri, 'RecoveryOp')])
      })

      await syncService.processPendingLogs()

      const dlqRecovered = await dlqRepo.findOne({
        where: { contentUri: 'uri_recovery' },
      })
      expect(dlqRecovered!.status).toBe(AuditLogDlqStatus.DONE)

      const logs = await auditLogRepo.find({
        where: { contentId: 'id_recovery' },
      })
      expect(logs.length).toBe(1)
      expect(logs[0].operation).toBe('RecoveryOp')
    })
  })

  describe('Group 5: Concurrency & Locks', () => {
    it('CON-01 & CON-02: Trùng lặp Job Overlap - Abort an toàn', async () => {
      mockSyncLockService.acquire.mockResolvedValueOnce(false)

      await syncTask.handleForwardSync()

      expect(mockSharepointService.fetchAllLogs).not.toHaveBeenCalled()
      expect(mockSyncLockService.release).not.toHaveBeenCalled()
    })

    it('IDP-01: Race Condition - Bỏ qua bản ghi không phải PENDING', async () => {
      await dlqRepo.save(
        makeDlqEntry({
          contentUri: 'uri_proc',
          contentId: 'id_proc',
          status: AuditLogDlqStatus.DONE,
        }),
      )

      await syncService.processPendingLogs()

      const dlqProc = await dlqRepo.findOne({
        where: { contentUri: 'uri_proc' },
      })
      expect(dlqProc!.status).toBe(AuditLogDlqStatus.DONE)
      expect(mockSharepointService.fetchActivityContent).not.toHaveBeenCalled()
    })

    it('CON-03: Ensure Lock is Released after execution (even on error)', async () => {
      mockSharepointService.fetchAllLogs.mockRejectedValue(
        new Error('Fatal API Failure'),
      )

      await syncTask.handleForwardSync()

      expect(mockSyncLockService.release).toHaveBeenCalledTimes(1)

      const dlqCount = await dlqRepo.count()
      const auditCount = await auditLogRepo.count()
      expect(dlqCount).toBe(0)
      expect(auditCount).toBe(0)
    })
  })

  describe('Group 6: Deep Edge Cases', () => {
    it('EXT-01: Top-level Throw - Quá trình thất bại toàn diện không ảnh hưởng watermark', async () => {
      await syncStateRepo.save({
        key: SYNC_CONFIG.STATE_WATERMARK_KEY,
        value: new Date('2026-08-01T00:00:00Z'),
      })
      mockSharepointService.fetchAllLogs.mockRejectedValue(
        new Error('Sharepoint 500 Internal Error'),
      )

      await syncTask.handleForwardSync()

      const state = await syncStateRepo.findOne({
        where: { key: SYNC_CONFIG.STATE_WATERMARK_KEY },
      })
      expect(state!.value!.toISOString()).toBe(
        new Date('2026-08-01T00:00:00Z').toISOString(),
      )
      expect(mockSyncLockService.release).toHaveBeenCalled()
    })

    it('EXT-02: Duplicate IDs - Dữ liệu trùng contentId từ list API', async () => {
      mockSharepointService.fetchAllLogs.mockResolvedValue([
        { contentUri: 'uri_dup', contentId: 'id_dup' },
        { contentUri: 'uri_dup', contentId: 'id_dup' },
      ])

      mockSharepointService.fetchActivityContent.mockResolvedValue([
        createMockActivity('uri_dup'),
      ])

      await syncTask.handleForwardSync()

      const dlqCount = await dlqRepo.count({ where: { contentId: 'id_dup' } })
      expect(dlqCount).toBe(1)
    })

    it('EXT-03: Empty Content - Log list có nhưng content rỗng', async () => {
      mockSharepointService.fetchAllLogs.mockResolvedValue([
        { contentUri: 'uri_empty', contentId: 'id_empty' },
      ])
      mockSharepointService.fetchActivityContent.mockResolvedValue([])

      await syncTask.handleForwardSync()

      const dlq = await dlqRepo.findOne({ where: { contentUri: 'uri_empty' } })
      expect(dlq!.status).toBe(AuditLogDlqStatus.DONE)
      expect(await auditLogRepo.count()).toBe(0)
    })

    it('EXT-04: Missing Fields - Fallback gracefully due to nullable columns', async () => {
      mockSharepointService.fetchAllLogs.mockResolvedValue([
        { contentUri: 'uri_invalid', contentId: 'id_invalid' },
      ])
      mockSharepointService.fetchActivityContent.mockResolvedValue([
        {
          Id: '00000000-0000-0000-0000-000000000002',
          Operation: 'MockOp',
          Workload: 'SharePoint',
        },
      ])

      await syncTask.handleForwardSync()

      const dlq = await dlqRepo.findOne({
        where: { contentUri: 'uri_invalid' },
      })
      expect(dlq!.status).toBe(AuditLogDlqStatus.DONE)
      const audit = await auditLogRepo.findOne({
        where: { contentId: 'id_invalid' },
      })
      expect(audit!.creationTime).toBeNull()
    })

    it('EXT-06: Upsert Conflict - Idempotency for Existing ID', async () => {
      const conflictId = '00000000-0000-0000-0000-000000000003'
      await auditLogRepo.save({
        microsoftId: conflictId,
        contentId: 'id_conflict',
        creationTime: new Date().toISOString(),
        operation: 'PreExisting',
        workload: 'SharePoint',
        rawData: {},
      })

      mockSharepointService.fetchAllLogs.mockResolvedValue([
        { contentUri: 'uri_conflict', contentId: 'id_conflict' },
      ])
      mockSharepointService.fetchActivityContent.mockResolvedValue([
        { ...createMockActivity('uri_conflict'), Id: conflictId },
      ])

      await syncTask.handleForwardSync()

      const dlq = await dlqRepo.findOne({
        where: { contentUri: 'uri_conflict' },
      })
      expect(dlq!.status).toBe(AuditLogDlqStatus.DONE)

      const audits = await auditLogRepo.find({
        where: { contentId: 'id_conflict' },
      })
      expect(audits.length).toBe(1)
      expect(audits[0].operation).toBe('PreExisting')
    })

    it('EXT-07: Lock Renewal - Heartbeat via setInterval', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })

      mockSharepointService.fetchAllLogs.mockResolvedValue([
        { contentUri: 'uri_slow', contentId: 'id_slow' },
      ])
      mockSharepointService.fetchActivityContent.mockImplementation((uri) => {
        jest.advanceTimersByTime(125 * 1000)
        return Promise.resolve([createMockActivity(uri)])
      })

      const syncPromise = syncTask.handleForwardSync()
      await syncPromise

      expect(mockSyncLockService.renewLock).toHaveBeenCalled()

      jest.useRealTimers()
    })

    it('EXT-08: Empty Input - Null/Empty contentUri handling', async () => {
      mockSharepointService.fetchAllLogs.mockResolvedValue([
        { contentUri: '', contentId: 'id_empty_uri' },
        { contentUri: null as any, contentId: 'id_null_uri' },
      ])

      await syncTask.handleForwardSync()

      const count = await dlqRepo.count()
      expect(count).toBe(0)
    })
  })
})
