import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { Logger } from '@common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLogSyncState } from '../modules/audit-log-sync/entities/audit-log-sync-state.entity'
import { AuditLogDlq } from '../modules/audit-log-sync/entities/audit-log-dlq.entity'
import { SyncLockService } from '../modules/audit-log-sync/sync-lock.service'
import { AuditLogSyncService } from '../modules/audit-log-sync/audit-log-sync.service'
import { SharepointService } from '../modules/sharepoint/sharepoint.service'
import { SYNC_CONFIG } from '../modules/audit-log-sync/constants/sync.constant'

import { splitIntoDailyWindows } from '../utils/date.util'

@Injectable()
export class AuditLogSyncTask {
  /**
   * Initializes the AuditLogSyncTask and sets up the logger context.
   *
   * @param {Repository<AuditLogSyncState>} syncStateRepo - Repository for synchronization state.
   * @param {Repository<AuditLogDlq>} dlqRepo - Repository for the dead letter queue.
   * @param {SyncLockService} syncLockService - Service for distributed locking.
   * @param {SharepointService} sharepointService - Service to interact with SharePoint API.
   * @param {AuditLogSyncService} syncService - Service to process fetched audit logs.
   * @param {Logger} logger - The logger instance.
   * @returns {void}
   */
  constructor(
    @InjectRepository(AuditLogSyncState)
    private readonly syncStateRepo: Repository<AuditLogSyncState>,
    @InjectRepository(AuditLogDlq)
    private readonly dlqRepo: Repository<AuditLogDlq>,
    private readonly syncLockService: SyncLockService,
    private readonly sharepointService: SharepointService,
    private readonly syncService: AuditLogSyncService,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(AuditLogSyncTask.name)
  }

  /**
   * Orchestrates the forward synchronization of SharePoint audit logs.
   * This handles Phase 1 (Backfill) and Phase 2 (Ongoing).
   *
   * @returns {Promise<void>} - Resolves when complete.
   */
  @Cron(SYNC_CONFIG.FORWARD_CRON_EXPRESSION)
  async handleForwardSync(): Promise<void> {
    this.logger.log('Starting forward sync orchestrator...')
    const locked = await this.syncLockService.acquire()
    if (!locked) {
      this.logger.warn('Skipping forward sync: lock held by another instance')
      return
    }

    // Gia hạn khoá tự động mỗi 1 phút để tránh bị steal nếu job chạy quá lâu
    const renewalInterval = setInterval(() => {
      this.syncLockService
        .renewLock()
        .catch((e) => this.logger.error('Failed to renew lock', e))
    }, 60 * 1000)

    try {
      let state = await this.syncStateRepo.findOne({
        where: { key: SYNC_CONFIG.STATE_WATERMARK_KEY },
      })

      const now = new Date()
      const ONE_DAY_MS = 24 * 60 * 60 * 1000

      const watermarkMs = state?.value
        ? state.value.getTime()
        : now.getTime() - SYNC_CONFIG.INITIAL_BACKFILL_DAYS * ONE_DAY_MS

      const safeNowMs = now.getTime() - SYNC_CONFIG.ZERO_LAG_MINUTES * 60_000
      const stepMs = SYNC_CONFIG.CATCHUP_STEP_DAYS * ONE_DAY_MS
      const targetWatermarkMs = Math.min(safeNowMs, watermarkMs + stepMs)

      if (targetWatermarkMs <= watermarkMs) {
        this.logger.log(
          'Forward sync: đã đuổi kịp safe window, không có gì để làm',
        )
        return
      }

      const start = new Date(watermarkMs)
      const end = new Date(targetWatermarkMs)

      this.logger.log(
        `Forward sync: fetching [${start.toISOString()} → ${end.toISOString()}]`,
      )

      const files = await this.sharepointService.fetchAllLogs({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      await this.syncService.insertToDlq(files)
      const result = await this.syncService.processPendingLogs()

      if (result.failed === 0) {
        if (!state) {
          state = this.syncStateRepo.create({
            key: SYNC_CONFIG.STATE_WATERMARK_KEY,
          })
        }
        state.value = end
        await this.syncStateRepo.save(state)
        this.logger.log(`Forward sync: completed up to ${end.toISOString()}`)
      } else {
        this.logger.warn(
          `Forward sync: ${result.failed} ID lỗi, watermark KHÔNG tiến, sẽ retry ở tick sau`,
        )
      }
    } catch (error: any) {
      this.logger.error('Forward sync failed', error.stack)
    } finally {
      clearInterval(renewalInterval)
      await this.syncLockService.release()
    }
  }

  /**
   * Orchestrates the reconciliation synchronization to catch delayed logs (Phase 3).
   * It scans a sliding window backwards without advancing the main watermark.
   *
   * @returns {Promise<void>} - Resolves when complete.
   */
  @Cron(`0 */${SYNC_CONFIG.RECONCILIATION_INTERVAL_HOURS} * * *`)
  async handleReconciliationSync(): Promise<void> {
    this.logger.log('Starting reconciliation sync orchestrator...')
    const locked = await this.syncLockService.acquire()
    if (!locked) {
      this.logger.warn(
        'Skipping reconciliation sync: lock held by another instance',
      )
      return
    }

    // Gia hạn khoá tự động mỗi 1 phút
    const renewalInterval = setInterval(() => {
      this.syncLockService
        .renewLock()
        .catch((e) => this.logger.error('Failed to renew lock', e))
    }, 60 * 1000)

    try {
      const now = new Date()
      const ONE_DAY_MS = 24 * 60 * 60 * 1000
      const safeNow = new Date(
        now.getTime() - SYNC_CONFIG.ZERO_LAG_MINUTES * 60_000,
      )
      const lookbackStart = new Date(
        safeNow.getTime() -
          SYNC_CONFIG.RECONCILIATION_LOOKBACK_DAYS * ONE_DAY_MS,
      )

      this.logger.log(
        `Reconciliation: quét lùi bắt delayed logs [${lookbackStart.toISOString()} → ${safeNow.toISOString()}]`,
      )

      const dayWindows = splitIntoDailyWindows(lookbackStart, safeNow)

      let totalFailed = 0
      for (const w of dayWindows) {
        const files = await this.sharepointService.fetchAllLogs({
          startTime: w.start.toISOString(),
          endTime: w.end.toISOString(),
        })
        await this.syncService.insertToDlq(files)
      }

      const result = await this.syncService.processPendingLogs()
      totalFailed = result.failed

      this.logger.log(
        `Reconciliation: hoàn tất, ${totalFailed} ID lỗi (không ảnh hưởng watermark chính)`,
      )
    } catch (error: any) {
      this.logger.error('Reconciliation sync failed', error.stack)
    } finally {
      clearInterval(renewalInterval)
      await this.syncLockService.release()
    }
  }
}
