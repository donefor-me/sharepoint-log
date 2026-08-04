import { Injectable, OnModuleInit } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AuditLogSyncState } from './entities/audit-log-sync-state.entity'
import { SYNC_CONFIG } from './constants/sync.constant'
import { Logger } from '@common/logger'

@Injectable()
export class SyncLockService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(SyncLockService.name)
  }

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

  async release(): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(AuditLogSyncState)
      .set({ lockedUntil: null })
      .where('key = :key', { key: SYNC_CONFIG.LOCK_KEY })
      .execute()
  }
}
