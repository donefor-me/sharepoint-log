import { ResponseMessage } from '@common/decorators/response-message.decorator'
import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'

import type { AuditLog } from '../audit-log-sync/entities/audit-log.entity'
import { GetAuditLogsDto } from './dto/get-audit-logs.dto'
import { SharepointDashboardService } from './sharepoint-dashboard.service'

/**
 * Controller for providing data to the SharePoint sync dashboard.
 * Endpoints are used by the frontend to display audit logs and sync status.
 */
@Controller('api/dashboard')
export class SharepointDashboardController {
  constructor(private readonly dashboardService: SharepointDashboardService) {}

  /**
   * Retrieves a paginated list of SharePoint audit logs.
   *
   * @param {GetAuditLogsDto} query - Pagination and filtering parameters.
   * @returns {Promise<{ data: AuditLog[], meta: { total: number, page: number, limit: number } }>}
   */
  @Get('audit-logs')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Audit logs retrieved successfully')
  async getAuditLogs(@Query() query: GetAuditLogsDto): Promise<{
    data: AuditLog[]
    meta: { total: number; page: number; limit: number }
  }> {
    const [data, total] = await this.dashboardService.getAuditLogs(query)
    return {
      data,
      meta: { total, page: query.page, limit: query.limit },
    }
  }

  /**
   * Retrieves the current health and timestamp of the background sync process.
   *
   * @returns {Promise<{ lastSyncTime: Date | null, status: 'Healthy' | 'Error' }>}
   */
  @Get('sync-status')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Sync status retrieved successfully')
  async getSyncStatus(): Promise<{
    lastSyncTime: Date | null
    status: 'Healthy' | 'Error'
  }> {
    return this.dashboardService.getSyncStatus()
  }
}
