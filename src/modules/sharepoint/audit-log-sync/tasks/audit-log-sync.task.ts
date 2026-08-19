import { runPool } from '@common/utils/array.util'
import { splitIntoDailyWindows } from '@common/utils/date.util'
import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { SharepointContentDto } from '../../integration/dto/sharepoint-management.dto'
import { SharepointService } from '../../integration/sharepoint.service'
import { AuditLogSyncService } from '../audit-log-sync.service'
import { SYNC_CONFIG } from '../constants/sync.constant'
import { AuditLogSyncState } from '../entities/audit-log-sync-state.entity'
import { SyncLockService } from '../sync-lock.service'

@Injectable()
export class AuditLogSyncTask {
  private readonly logger = new Logger(AuditLogSyncTask.name)

  constructor(
    @InjectRepository(AuditLogSyncState)
    private readonly syncStateRepo: Repository<AuditLogSyncState>,
    private readonly syncLockService: SyncLockService,
    private readonly sharepointService: SharepointService,
    private readonly syncService: AuditLogSyncService,
  ) {}

  /**
   * Orchestrates the forward synchronization of SharePoint audit logs.
   * This handles Phase 1 (Backfill) and Phase 2 (Ongoing).
   *
   * @returns {Promise<void>} - Resolves when complete.
   */
  @Cron('*/30 * * * *')
  async handleForwardSync(): Promise<void> {
    this.logger.log(
      { action: 'forward_sync_start' },
      '[Sync:Forward] Starting forward sync orchestrator...',
    )
    const locked = await this.syncLockService.acquire()
    if (!locked) {
      this.logger.warn(
        {
          action: 'forward_sync_skip',
          reason: 'lock held by another instance',
        },
        '[Sync:Forward] Skipping sync',
      )
      return
    }

    const renewalInterval = setInterval(() => {
      this.syncLockService
        .renewLock()
        .catch((e) =>
          this.logger.error(
            { action: 'renew_lock_failed', error: e.message },
            '[Sync:Lock] Failed to renew lock',
          ),
        )
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
          { action: 'forward_sync_caught_up' },
          '[Sync:Forward] Caught up to safe window, nothing to fetch',
        )
        return
      }

      const start = new Date(watermarkMs)
      const end = new Date(targetWatermarkMs)

      this.logger.log(
        {
          action: 'forward_sync_fetching',
          start: start.toISOString(),
          end: end.toISOString(),
        },
        '[Sync:Forward] Fetching audit logs',
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
        this.logger.log(
          { action: 'forward_sync_success', watermarkEnd: end.toISOString() },
          '[Sync:Forward] Completed successfully',
        )
      } else {
        this.logger.warn(
          {
            action: 'forward_sync_partial_failure',
            failedIdsCount: result.failed,
          },
          '[Sync:Forward] Sync partially failed, will retry',
        )
      }
    } catch (error: any) {
      this.logger.error(
        {
          action: 'forward_sync_failed',
          error: error.message,
          stack: error.stack,
        },
        '[Sync:Forward] Sync failed',
      )
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
  @Cron('0 */6 * * *')
  async handleReconciliationSync(): Promise<void> {
    this.logger.log(
      { action: 'reconciliation_sync_start' },
      '[Sync:Reconciliation] Starting reconciliation sync orchestrator...',
    )
    const locked = await this.syncLockService.acquire()
    if (!locked) {
      this.logger.warn(
        {
          action: 'reconciliation_sync_skip',
          reason: 'lock held by another instance',
        },
        '[Sync:Reconciliation] Skipping sync',
      )
      return
    }

    const renewalInterval = setInterval(() => {
      this.syncLockService
        .renewLock()
        .catch((e) =>
          this.logger.error(
            { action: 'renew_lock_failed', error: e.message },
            '[Sync:Lock] Failed to renew lock',
          ),
        )
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
        {
          action: 'reconciliation_sync_scanning',
          start: lookbackStart.toISOString(),
          end: safeNow.toISOString(),
        },
        '[Sync:Reconciliation] Scanning backwards for delayed logs',
      )

      const dayWindows = splitIntoDailyWindows(lookbackStart, safeNow)

      let totalFailed = 0
      const fetchTasks = dayWindows.map(
        (w) => () =>
          this.sharepointService.fetchAllLogs({
            startTime: w.start.toISOString(),
            endTime: w.end.toISOString(),
          }),
      )
      const fetchResults = await runPool(
        fetchTasks,
        SYNC_CONFIG.RECONCILIATION_FETCH_CONCURRENCY,
      )
      const allFiles = fetchResults
        .filter((r, i): r is PromiseFulfilledResult<SharepointContentDto[]> => {
          if (r.status === 'fulfilled') return true
          this.logger.warn(
            {
              action: 'reconciliation_sync_fetch_failed',
              start: dayWindows[i].start.toISOString(),
              end: dayWindows[i].end.toISOString(),
              error: (r.reason as Error).message,
            },
            '[Sync:Reconciliation] Failed to fetch logs for window',
          )
          return false
        })
        .flatMap((r) => r.value)
      if (allFiles.length > 0) {
        await this.syncService.insertToDlq(allFiles)
      }

      const result = await this.syncService.processPendingLogs()
      totalFailed = result.failed

      this.logger.log(
        { action: 'reconciliation_sync_success', failedIdsCount: totalFailed },
        '[Sync:Reconciliation] Completed',
      )
    } catch (error: any) {
      this.logger.error(
        {
          action: 'reconciliation_sync_failed',
          error: error.message,
          stack: error.stack,
        },
        '[Sync:Reconciliation] Sync failed',
      )
    } finally {
      clearInterval(renewalInterval)
      await this.syncLockService.release()
    }
  }
}
