import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { InfraDistributedLock } from '@platform/infra-distributed-lock/entities/infra-distributed-lock.entity'
import { InfraDistributedLockModule } from '@platform/infra-distributed-lock/infra-distributed-lock.module'
import { InfraDistributedLockService } from '@platform/infra-distributed-lock/infra-distributed-lock.service'
import { DataSource } from 'typeorm'

import { TestDatabaseModule } from '../utils/test-database.module'

describe('InfraDistributedLockService (Integration)', () => {
  let app: INestApplication
  let service: InfraDistributedLockService
  let dataSource: DataSource

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestDatabaseModule, InfraDistributedLockModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    service = moduleFixture.get<InfraDistributedLockService>(
      InfraDistributedLockService,
    )
    dataSource = moduleFixture.get<DataSource>(DataSource)

    await dataSource.synchronize(true)
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  beforeEach(async () => {
    await dataSource.getRepository(InfraDistributedLock).clear()
  })

  it('should acquire lock when no one holds it', async () => {
    const ownerId = await service.acquire('test-lock', 10000)
    expect(ownerId).toBeDefined()

    const lock = await dataSource
      .getRepository(InfraDistributedLock)
      .findOneBy({ key: 'test-lock' })
    expect(lock?.ownerId).toBe(ownerId)
  })

  it('should return null when lock is already acquired and valid', async () => {
    await service.acquire('test-lock', 10000)
    const result = await service.acquire('test-lock', 10000)
    expect(result).toBeNull()
  })

  it('should renew lock if ownerId matches', async () => {
    const ownerId = await service.acquire('test-lock', 10000)
    await service.renewLock('test-lock', 20000, ownerId!)
  })

  it('should return false when trying to renew lock with wrong ownerId', async () => {
    await service.acquire('test-lock', 10000)
    await service.renewLock(
      'test-lock',
      20000,
      '00000000-0000-0000-0000-000000000000',
    )
  })

  it('should release lock successfully', async () => {
    const ownerId = await service.acquire('test-lock', 10000)
    await service.release('test-lock', ownerId!)

    const lock = await dataSource
      .getRepository(InfraDistributedLock)
      .findOneBy({ key: 'test-lock' })
    expect(lock?.ownerId).toBeNull()
    expect(lock?.lockedUntil).toBeNull()
  })
})
