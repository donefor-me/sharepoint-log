import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

export interface AuditLogQueryOptions {
  operation?: string[]
  userId?: string
  userName?: string
  fileName?: string
  workload?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}
import { AuditLog } from './entities/audit-log.entity'
import { AuditLogSyncState } from './entities/audit-log-sync-state.entity'

@Injectable()
export class AuditLogQueryService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(AuditLogSyncState)
    private readonly auditLogSyncStateRepository: Repository<AuditLogSyncState>,
  ) {}

  async queryLogs(
    options: AuditLogQueryOptions,
  ): Promise<[AuditLog[], number]> {
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
    } = options

    const query = this.auditLogRepository.createQueryBuilder('log')

    if (operation && operation.length > 0) {
      query.andWhere('log.operation IN (:...operation)', { operation })
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

  async getSyncWatermark(): Promise<Date | null> {
    const watermark = await this.auditLogSyncStateRepository.findOne({
      where: { key: 'sharepoint_watermark' },
    })
    return watermark?.value || null
  }
}
