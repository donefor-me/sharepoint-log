/* eslint-disable @typescript-eslint/unbound-method */
import { GetAuditLogsDto } from '@modules/sharepoint-dashboard/dto/get-audit-logs.dto'
import { SharepointDashboardController } from '@modules/sharepoint-dashboard/sharepoint-dashboard.controller'
import { SharepointDashboardService } from '@modules/sharepoint-dashboard/sharepoint-dashboard.service'
import { Test, TestingModule } from '@nestjs/testing'

describe('SharepointDashboardController', () => {
  let controller: SharepointDashboardController
  let service: jest.Mocked<SharepointDashboardService>

  beforeEach(async () => {
    service = {
      getAuditLogs: jest.fn().mockResolvedValue([[], 0]),
      getSyncStatus: jest
        .fn()
        .mockResolvedValue({ lastSyncTime: null, status: 'Healthy' }),
    } as any

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SharepointDashboardController],
      providers: [{ provide: SharepointDashboardService, useValue: service }],
    }).compile()

    controller = module.get<SharepointDashboardController>(
      SharepointDashboardController,
    )
  })

  it('should call getAuditLogs from service with query params', async () => {
    const dto = new GetAuditLogsDto()
    dto.page = 1
    dto.limit = 10

    await controller.getAuditLogs(dto)
    expect(service.getAuditLogs).toHaveBeenCalledWith(dto)
  })

  it('should call getSyncStatus from service', async () => {
    await controller.getSyncStatus()
    expect(service.getSyncStatus).toHaveBeenCalled()
  })
})
