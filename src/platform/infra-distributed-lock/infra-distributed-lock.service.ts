import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DataSource, QueryFailedError } from 'typeorm'

import { InfraDistributedLock } from './entities/infra-distributed-lock.entity'

/**
 * Infrastructure service providing a database-backed distributed lock mechanism.
 * Uses PostgreSQL pessimistic write locks within transactions to prevent concurrent
 * execution of the same job across multiple application instances or pods.
 */
@Injectable()
export class InfraDistributedLockService {
  private readonly logger = new Logger(InfraDistributedLockService.name)

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Attempts to acquire an exclusive, distributed lock for background syncing tasks.
   * Uses a pessimistic write lock within a transaction to prevent race conditions.
   * If the lock doesn't exist, it automatically creates it.
   * Returns null if the lock is currently held by another active process.
   *
   * @returns {Promise<string | null>} - Resolves to the unique ownerId (UUID)
   * if the lock was successfully acquired, null otherwise.
   */
  async acquire(key: string, ttl: number): Promise<string | null> {
    return this.dataSource.transaction(async (manager) => {
      let row = await manager.findOne(InfraDistributedLock, {
        where: { key },
        lock: { mode: 'pessimistic_write' },
      })

      const now = new Date()
      const ownerId = randomUUID()

      if (!row) {
        try {
          row = manager.create(InfraDistributedLock, {
            key,
            lockedUntil: new Date(now.getTime() + ttl),
            ownerId,
          })
          await manager.save(InfraDistributedLock, row)
          return ownerId
        } catch (error) {
          const pgCode = (error as QueryFailedError & { code?: string }).code
          const uniqueViolationErr = '23505'
          if (
            error instanceof QueryFailedError &&
            pgCode === uniqueViolationErr
          ) {
            // Race condition: another process inserted the row first (Unique Violation)
            this.logger.warn(
              { action: 'lock_acquire_conflict', key },
              'Lock creation conflicted with another process',
            )
            return null
          }
          throw error
        }
      }

      if (row.lockedUntil && row.lockedUntil > now) {
        this.logger.log(
          { action: 'lock_acquire_busy', key, lockedUntil: row.lockedUntil },
          'Lock is currently held by another process',
        )
        return null
      }

      row.lockedUntil = new Date(now.getTime() + ttl)
      row.ownerId = ownerId
      await manager.save(InfraDistributedLock, row)
      return ownerId
    })
  }

  /**
   * Renews the TTL (Time-To-Live) of an already acquired lock.
   * Used in long-running processes to prevent the lock from expiring before the task finishes.
   *
   * @returns {Promise<void>}
   */
  async renewLock(key: string, ttl: number, ownerId: string): Promise<void> {
    const now = new Date()
    await this.dataSource
      .createQueryBuilder()
      .update(InfraDistributedLock)
      .set({ lockedUntil: new Date(now.getTime() + ttl) })
      .where('key = :key', { key })
      .andWhere('owner_id = :ownerId', { ownerId })
      .execute()
  }

  /**
   * Releases the lock by clearing the lockedUntil timestamp.
   * Allows other instances to acquire the lock for subsequent tasks.
   *
   * @returns {Promise<void>}
   */
  async release(key: string, ownerId: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(InfraDistributedLock)
      .set({ lockedUntil: null, ownerId: null })
      .where('key = :key', { key })
      .andWhere('owner_id = :ownerId', { ownerId })
      .execute()
  }
}
