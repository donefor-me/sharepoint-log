import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { InfraWatermark } from '@platform/infra-watermark/entities/infra-watermark.entity'
import { InfraWatermarkModule } from '@platform/infra-watermark/infra-watermark.module'
import { InfraWatermarkService } from '@platform/infra-watermark/infra-watermark.service'
import { DataSource } from 'typeorm'

import { TestDatabaseModule } from '../utils/test-database.module'

describe('InfraWatermarkService (Integration)', () => {
  let app: INestApplication
  let service: InfraWatermarkService
  let dataSource: DataSource

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestDatabaseModule, InfraWatermarkModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    service = moduleFixture.get<InfraWatermarkService>(InfraWatermarkService)
    dataSource = moduleFixture.get<DataSource>(DataSource)

    await dataSource.synchronize(true)
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  beforeEach(async () => {
    await dataSource.getRepository(InfraWatermark).clear()
  })

  it('should return null if no watermark is found', async () => {
    const result = await service.getWatermark('test-key')
    expect(result).toBeNull()
  })

  it('should set watermark and return it properly', async () => {
    const date = new Date()
    await service.setWatermark('test-key', date)

    const result = await service.getWatermark('test-key')
    expect(result?.toISOString()).toBe(date.toISOString())
  })

  it('should upsert watermark using orUpdate successfully without unique constraint error', async () => {
    const date1 = new Date('2026-09-01T00:00:00Z')
    await service.setWatermark('test-key', date1)

    const date2 = new Date('2026-09-02T00:00:00Z')
    await service.setWatermark('test-key', date2)

    const result = await service.getWatermark('test-key')
    expect(result?.toISOString()).toBe(date2.toISOString())

    const count = await dataSource.getRepository(InfraWatermark).count()
    expect(count).toBe(1)
  })
})
