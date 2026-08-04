import { Controller, Get, Query, BadRequestException } from '@nestjs/common'
import { SharepointDashboardService } from './sharepoint-dashboard.service'
import { GetAuditLogsSchema } from './dto/get-audit-logs.dto'

@Controller('v1/dashboard')
export class SharepointDashboardController {
  constructor(private readonly dashboardService: SharepointDashboardService) {}

  @Get('audit-logs')
  async getAuditLogs(@Query() rawQuery: Record<string, any>) {
    const queryResult = GetAuditLogsSchema.safeParse(rawQuery)
    if (!queryResult.success) {
      throw new BadRequestException(queryResult.error.format())
    }
    const query = queryResult.data
    const [data, total] = await this.dashboardService.getAuditLogs(query)
    return { data, total, page: query.page, limit: query.limit }
  }

  @Get('sync-status')
  async getSyncStatus() {
    return this.dashboardService.getSyncStatus()
  }
}
