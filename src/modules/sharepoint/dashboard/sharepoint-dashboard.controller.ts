import { Controller, Get, Query } from '@nestjs/common'

import { GetAuditLogsDto } from './dto/get-audit-logs.dto'
import { SharepointDashboardService } from './sharepoint-dashboard.service'

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
