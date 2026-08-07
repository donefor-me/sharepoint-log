import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuditLog } from '../entities/audit-log.entity'

@Injectable()
export class AuditLogRepository {
  /**
   * Initializes the AuditLogRepository.
   *
   * @param {Repository<AuditLog>} repository - The underlying TypeORM repository for the AuditLog entity.
   * @returns {void}
   */
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  /**
   * Creates a new AuditLog entity instance in memory based on the provided partial data.
   * Note: This does not save the entity to the database.
   *
   * @param {Partial<AuditLog>} data - The partial data to instantiate the log entity with.
   * @returns {AuditLog} - The instantiated AuditLog entity.
   */
  create(data: Partial<AuditLog>): AuditLog {
    return this.repository.create(data)
  }

  /**
   * Exposes the underlying TypeORM query builder for constructing complex custom queries.
   *
   * @param {string} [alias] - Optional alias for the AuditLog table in the query.
   * @returns {SelectQueryBuilder<AuditLog>} - The TypeORM SelectQueryBuilder instance.
   */
  createQueryBuilder(alias?: string) {
    return this.repository.createQueryBuilder(alias)
  }
}
