import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from '../entities/audit-log.entity'

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  create(data: Partial<AuditLog>): AuditLog {
    return this.repository.create(data)
  }

  createQueryBuilder(alias?: string) {
    return this.repository.createQueryBuilder(alias)
  }
}
