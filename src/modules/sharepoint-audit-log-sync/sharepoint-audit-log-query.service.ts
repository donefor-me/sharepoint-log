import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { InfraWatermarkService } from '@platform/infra-watermark/infra-watermark.service'
import { Repository } from 'typeorm'

import { SYNC_CONFIG } from './constants/sync.constant'
import { AuditLog } from './entities/audit-log.entity'

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

@Injectable()
export class SharepointAuditLogQueryService {
  private readonly logger = new Logger(SharepointAuditLogQueryService.name)

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly infraWatermarkService: InfraWatermarkService,
  ) {}

  async queryLogs(
    options: AuditLogQueryOptions,
  ): Promise<[AuditLog[], number]> {
    this.logger.log(
      { action: 'db_query_logs', filters: options },
      'Querying audit logs from database',
    )

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
    query.select([
      'log.id',
      'log.creationTime',
      'log.operation',
      'log.userId',
      'log.objectId',
      'log.itemName',
      'log.workload',
    ])
    query.skip((page - 1) * limit).take(limit)

    return query.getManyAndCount()
  }

  async getSyncWatermark(): Promise<Date | null> {
    return this.infraWatermarkService.getWatermark(
      SYNC_CONFIG.SHAREPOINT_LAST_SYNC_TIME_KEY,
    )
  }
}
