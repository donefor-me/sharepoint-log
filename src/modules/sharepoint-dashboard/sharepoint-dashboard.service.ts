import { Injectable } from '@nestjs/common'

import { SharepointAuditLogQueryService } from '../sharepoint-audit-log-sync/sharepoint-audit-log-query.service'
import { AuditLog } from '../sharepoint-audit-log-sync/entities/audit-log.entity'
import { GetAuditLogsDto } from './dto/get-audit-logs.dto'

@Injectable()
export class SharepointDashboardService {
  constructor(private readonly queryService: SharepointAuditLogQueryService) {}

  async getAuditLogs(dto: GetAuditLogsDto): Promise<[AuditLog[], number]> {
    return this.queryService.queryLogs(dto)
  }

  async getSyncStatus(): Promise<{
    lastSyncTime: Date | null
    status: 'Healthy' | 'Error'
  }> {
    const watermark = await this.queryService.getSyncWatermark()

    return {
      lastSyncTime: watermark,
      status: 'Healthy',
    }
  }
}
