import { Logger } from '@common'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { DataSource } from 'typeorm'

import { SYNC_CONFIG } from './constants/sync.constant'
import { AuditLogSyncState } from './entities/audit-log-sync-state.entity'

@Injectable()
export class SyncLockService implements OnModuleInit {
  /**
   * Initializes the SyncLockService with the TypeORM data source and custom logger.
   *
   * @param {DataSource} dataSource - The TypeORM data source used for database queries and transactions.
   * @param {Logger} logger - The application logger instance.
   * @returns {void}
   */
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(SyncLockService.name)
  }

  /**
   * Pre-seeds the database with the initial lock state upon module initialization.
   * Ensures the lock row exists so that pessimistic locking can be applied later.
   *
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(AuditLogSyncState)
      .values({ key: SYNC_CONFIG.LOCK_KEY, lockedUntil: null })
      .orIgnore()
      .execute()
    this.logger.log('Lock row pre-seeded successfully')
  }

  /**
   * Attempts to acquire an exclusive, distributed lock for background syncing tasks.
   * Uses a pessimistic write lock within a transaction to prevent race conditions across multiple pods/instances.
   * Returns false if the lock is currently held by another active process.
   *
   * @returns {Promise<boolean>} - Resolves to true if the lock was successfully acquired, false otherwise.
   */
  async acquire(): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const row = await manager.findOne(AuditLogSyncState, {
        where: { key: SYNC_CONFIG.LOCK_KEY },
        lock: { mode: 'pessimistic_write' },
      })

      if (!row) {
        this.logger.warn('Lock row missing unexpectedly')
        return false
      }

      const now = new Date()
      if (row.lockedUntil && row.lockedUntil > now) {
        return false
      }

      row.lockedUntil = new Date(now.getTime() + SYNC_CONFIG.LOCK_TTL_MS)
      await manager.save(AuditLogSyncState, row)
      return true
    })
  }

  /**
   * Renews the TTL (Time-To-Live) of an already acquired lock.
   * Used in long-running processes to prevent the lock from expiring before the task finishes.
   *
   * @returns {Promise<void>}
   */
  async renewLock(): Promise<void> {
    const now = new Date()
    await this.dataSource
      .createQueryBuilder()
      .update(AuditLogSyncState)
      .set({
        lockedUntil: new Date(now.getTime() + SYNC_CONFIG.LOCK_TTL_MS),
      })
      .where('key = :key', { key: SYNC_CONFIG.LOCK_KEY })
      .execute()
  }

  /**
   * Releases the lock by clearing the lockedUntil timestamp.
   * Allows other instances to acquire the lock for subsequent tasks.
   *
   * @returns {Promise<void>}
   */
  async release(): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(AuditLogSyncState)
      .set({ lockedUntil: null })
      .where('key = :key', { key: SYNC_CONFIG.LOCK_KEY })
      .execute()
  }
}
