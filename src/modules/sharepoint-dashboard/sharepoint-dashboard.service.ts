import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuditLog } from '../audit-log-sync/entities/audit-log.entity'
import { AuditLogSyncState } from '../audit-log-sync/entities/audit-log-sync-state.entity'
import { GetAuditLogsDto } from './dto/get-audit-logs.dto'

@Injectable()
export class SharepointDashboardService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(AuditLogSyncState)
    private readonly auditLogSyncStateRepository: Repository<AuditLogSyncState>,
  ) {}

  async getAuditLogs(dto: GetAuditLogsDto): Promise<[AuditLog[], number]> {
    const {
      operation,
      userId,
      userName,
      fileName,
      workload,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = dto

    const query = this.auditLogRepository.createQueryBuilder('log')

    if (operation) {
      query.andWhere('log.operation = :operation', { operation })
    }

    if (userId) {
      query.andWhere('log.userId = :userId', { userId })
    }

    if (workload) {
      query.andWhere('log.workload = :workload', { workload })
    }

    if (userName) {
      query.andWhere('log.userId ILIKE :userName', {
        userName: `%${userName}%`,
      })
    }

    if (fileName) {
      query.andWhere(
        '(log.objectId ILIKE :fileName OR log.itemName ILIKE :fileName)',
        { fileName: `%${fileName}%` },
      )
    }

    if (startDate) {
      query.andWhere('log.creationTime >= :startDate', { startDate })
    }

    if (endDate) {
      query.andWhere('log.creationTime <= :endDate', { endDate })
    }

    query.orderBy('log.creationTime', 'DESC')
    query.skip((page - 1) * limit).take(limit)

    return query.getManyAndCount()
  }

  async getSyncStatus(): Promise<{
    lastSyncTime: Date | null
    status: 'Healthy' | 'Error'
  }> {
    const watermark = await this.auditLogSyncStateRepository.findOne({
      where: { key: 'sharepoint_watermark' },
    })

    return {
      lastSyncTime: watermark?.value || null,
      status: 'Healthy', // Always healthy for now, can be extended later to detect stale watermarks
    }
  }
}
