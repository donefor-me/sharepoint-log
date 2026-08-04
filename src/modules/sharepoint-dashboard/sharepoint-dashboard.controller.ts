import { Controller, Get, Query } from '@nestjs/common'
import { SharepointDashboardService } from './sharepoint-dashboard.service'
import { GetAuditLogsDto } from './dto/get-audit-logs.dto'

@Controller('api/dashboard')
export class SharepointDashboardController {
  constructor(private readonly dashboardService: SharepointDashboardService) {}

  @Get('audit-logs')
  async getAuditLogs(@Query() query: GetAuditLogsDto) {
    const [data, total] = await this.dashboardService.getAuditLogs(query)
    return {
      data,
      meta: { total, page: query.page, limit: query.limit },
    }
  }

  @Get('sync-status')
  async getSyncStatus() {
    return this.dashboardService.getSyncStatus()
  }
}
