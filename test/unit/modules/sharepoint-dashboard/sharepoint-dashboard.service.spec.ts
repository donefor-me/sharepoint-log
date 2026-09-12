import { Test, TestingModule } from '@nestjs/testing'

import { AuditLog } from '../../../../src/modules/sharepoint-audit-log-sync/entities/audit-log.entity'
import { SharepointAuditLogQueryService } from '../../../../src/modules/sharepoint-audit-log-sync/sharepoint-audit-log-query.service'
import { GetAuditLogsDto } from '../../../../src/modules/sharepoint-dashboard/dto/get-audit-logs.dto'
import { SharepointDashboardService } from '../../../../src/modules/sharepoint-dashboard/sharepoint-dashboard.service'

describe('SharepointDashboardService', () => {
  let service: SharepointDashboardService
  let queryService: jest.Mocked<SharepointAuditLogQueryService>

  beforeEach(async () => {
    const mockQueryService = {
      queryLogs: jest.fn(),
      getSyncWatermark: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharepointDashboardService,
        {
          provide: SharepointAuditLogQueryService,
          useValue: mockQueryService,
        },
      ],
    }).compile()

    service = module.get<SharepointDashboardService>(SharepointDashboardService)
    queryService = module.get(SharepointAuditLogQueryService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getAuditLogs', () => {
    it('should call queryService.queryLogs and return results', async () => {
      const mockDto = new GetAuditLogsDto()
      mockDto.page = 1
      mockDto.limit = 10

      const mockResult: [AuditLog[], number] = [[{ id: 1 } as AuditLog], 1]
      queryService.queryLogs.mockResolvedValue(mockResult)

      const result = await service.getAuditLogs(mockDto)

      expect(jest.spyOn(queryService, 'queryLogs')).toHaveBeenCalledWith(
        mockDto,
      )
      expect(result).toEqual(mockResult)
    })
  })

  describe('getSyncStatus', () => {
    it('should return Healthy status and watermark date', async () => {
      const mockDate = new Date()
      queryService.getSyncWatermark.mockResolvedValue(mockDate)

      const result = await service.getSyncStatus()

      expect(jest.spyOn(queryService, 'getSyncWatermark')).toHaveBeenCalled()
      expect(result).toEqual({
        lastSyncTime: mockDate,
        status: 'Healthy',
      })
    })

    it('should return Healthy status and null if watermark does not exist', async () => {
      queryService.getSyncWatermark.mockResolvedValue(null)

      const result = await service.getSyncStatus()

      expect(jest.spyOn(queryService, 'getSyncWatermark')).toHaveBeenCalled()

      expect(result).toEqual({
        lastSyncTime: null,
        status: 'Healthy',
      })
    })
  })
})
