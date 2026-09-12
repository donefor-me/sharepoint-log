import { runPool } from '@common/utils/array.util'
import { splitIntoDailyWindows } from '@common/utils/date.util'
import { loggerContext } from '@core/logger/logger.context'
import { SharepointContentDto } from '@modules/sharepoint-integration/dto/sharepoint-management.dto'
import { SharepointIntegrationService } from '@modules/sharepoint-integration/sharepoint-integration.service'
import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InfraDistributedLockService } from '@platform/infra-distributed-lock/infra-distributed-lock.service'
import { InfraWatermarkService } from '@platform/infra-watermark/infra-watermark.service'
import { randomUUID } from 'crypto'

import { SYNC_CONFIG } from '../constants/sync.constant'
import { SharepointAuditLogSyncService } from '../sharepoint-audit-log-sync.service'

@Injectable()
export class SharepointAuditLogSyncTask {
  private readonly logger = new Logger(SharepointAuditLogSyncTask.name)

  constructor(
    private readonly infraWatermarkService: InfraWatermarkService,
    private readonly distributedLockService: InfraDistributedLockService,
    private readonly sharepointService: SharepointIntegrationService,
    private readonly syncService: SharepointAuditLogSyncService,
  ) {}

  /**
   * Orchestrates the forward synchronization of SharePoint audit logs.
   * This handles Phase 1 (Backfill) and Phase 2 (Ongoing).
   *
   * @returns {Promise<void>} - Resolves when complete.
   */
  @Cron('*/30 * * * *')
  async handleForwardSync(): Promise<void> {
    const traceId = 'sync_fw_' + randomUUID()
    this.logger.log(
      { action: 'forward_sync_start', traceId },
      '[Sync:Forward] Starting forward sync orchestrator...',
    )

    await this.runWithLock(
      traceId,
      'forward_sync',
      '[Sync:Forward]',
      async () => {
        try {
          const watermarkDate = await this.infraWatermarkService.getWatermark(
            SYNC_CONFIG.SHAREPOINT_LAST_SYNC_TIME_KEY,
          )

          const now = new Date()
          const ONE_DAY_MS = 24 * 60 * 60 * 1000

          const watermarkMs = watermarkDate
            ? watermarkDate.getTime()
            : now.getTime() - SYNC_CONFIG.INITIAL_BACKFILL_DAYS * ONE_DAY_MS

          const safeNowMs =
            now.getTime() - SYNC_CONFIG.ZERO_LAG_MINUTES * 60_000
          const stepMs = SYNC_CONFIG.CATCHUP_STEP_DAYS * ONE_DAY_MS
          const targetWatermarkMs = Math.min(safeNowMs, watermarkMs + stepMs)

          if (targetWatermarkMs <= watermarkMs) {
            this.logger.log(
              { action: 'forward_sync_caught_up', traceId },
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
              traceId,
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
            await this.infraWatermarkService.setWatermark(
              SYNC_CONFIG.SHAREPOINT_LAST_SYNC_TIME_KEY,
              end,
            )
            this.logger.log(
              {
                action: 'forward_sync_success',
                watermarkEnd: end.toISOString(),
                traceId,
              },
              '[Sync:Forward] Completed successfully',
            )
          } else {
            this.logger.warn(
              {
                action: 'forward_sync_partial_failure',
                failedIdsCount: result.failed,
                traceId,
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
              traceId,
            },
            '[Sync:Forward] Sync failed',
          )
        }
      },
    )
  }

  /**
   * Orchestrates the reconciliation synchronization to catch delayed logs (Phase 3).
   * It scans a sliding window backwards without advancing the main watermark.
   *
   * @returns {Promise<void>} - Resolves when complete.
   */
  @Cron('0 */6 * * *')
  async handleReconciliationSync(): Promise<void> {
    const traceId = 'sync_rc_' + randomUUID()
    this.logger.log(
      { action: 'reconciliation_sync_start', traceId },
      '[Sync:Reconciliation] Starting reconciliation sync orchestrator...',
    )

    await this.runWithLock(
      traceId,
      'reconciliation_sync',
      '[Sync:Reconciliation]',
      async () => {
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
              traceId,
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
            .filter(
              (r, i): r is PromiseFulfilledResult<SharepointContentDto[]> => {
                if (r.status === 'fulfilled') return true
                this.logger.warn(
                  {
                    action: 'reconciliation_sync_fetch_failed',
                    start: dayWindows[i].start.toISOString(),
                    end: dayWindows[i].end.toISOString(),
                    error: (r.reason as Error).message,
                    traceId,
                  },
                  '[Sync:Reconciliation] Failed to fetch logs for window',
                )
                return false
              },
            )
            .flatMap((r) => r.value)
          if (allFiles.length > 0) {
            await this.syncService.insertToDlq(allFiles)
          }

          const result = await this.syncService.processPendingLogs()
          totalFailed = result.failed

          this.logger.log(
            {
              action: 'reconciliation_sync_success',
              failedIdsCount: totalFailed,
              traceId,
            },
            '[Sync:Reconciliation] Completed',
          )
        } catch (error: any) {
          this.logger.error(
            {
              action: 'reconciliation_sync_failed',
              error: error.message,
              stack: error.stack,
              traceId,
            },
            '[Sync:Reconciliation] Sync failed',
          )
        }
      },
    )
  }

  private async runWithLock<T>(
    traceId: string,
    action: string,
    logLabel: string,
    fn: () => Promise<T>,
  ): Promise<T | undefined> {
    const ownerId = await this.distributedLockService.acquire(
      SYNC_CONFIG.SHAREPOINT_SYNC_LOCK_KEY,
      SYNC_CONFIG.LOCK_TTL_MS,
    )
    if (!ownerId) {
      this.logger.warn(
        {
          action: `${action}_skip`,
          reason: 'lock held by another instance',
          traceId,
        },
        `${logLabel} Skipping sync`,
      )
      return undefined
    }

    const renewalInterval = setInterval(() => {
      this.distributedLockService
        .renewLock(
          SYNC_CONFIG.SHAREPOINT_SYNC_LOCK_KEY,
          SYNC_CONFIG.LOCK_TTL_MS,
          ownerId,
        )
        .catch((e) =>
          this.logger.error(
            { action: 'renew_lock_failed', error: e.message, traceId },
            '[Sync:Lock] Failed to renew lock',
          ),
        )
    }, 60 * 1000)

    try {
      return await loggerContext.run({ traceId }, fn)
    } finally {
      clearInterval(renewalInterval)
      await this.distributedLockService.release(
        SYNC_CONFIG.SHAREPOINT_SYNC_LOCK_KEY,
        ownerId,
      )
    }
  }
}
