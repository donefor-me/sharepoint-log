import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { Logger } from '@common/logger'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLogSyncState } from '@modules/audit-log-sync/entities/audit-log-sync-state.entity'
import { SyncLockService } from '@modules/audit-log-sync/sync-lock.service'
import { SharepointService } from '@modules/sharepoint/sharepoint.service'
import { AuditLogSyncService } from '@modules/audit-log-sync/audit-log-sync.service'
import { SYNC_CONFIG } from '@modules/audit-log-sync/constants/sync.constant'

@Injectable()
export class AuditLogTask {
  constructor(
    @InjectRepository(AuditLogSyncState)
    private readonly syncStateRepo: Repository<AuditLogSyncState>,
    private readonly syncLockService: SyncLockService,
    private readonly sharepointService: SharepointService,
    private readonly fileProcessor: AuditLogSyncService,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(AuditLogTask.name)
  }

  /** Cron: Incremental sync every 30 minutes */
  @Cron('*/30 * * * *')
  async handleIncrementalSync() {
    this.logger.log('Starting incremental sync...')
    const locked = await this.syncLockService.acquire()
    if (!locked) {
      this.logger.warn(
        'Skipping incremental sync: lock held by another instance',
      )
      return
    }

    try {
      let state = await this.syncStateRepo.findOne({
        where: { key: SYNC_CONFIG.STATE_WATERMARK_KEY },
      })

      const now = new Date()
      const watermark = state?.value
        ? state.value.getTime()
        : now.getTime() - SYNC_CONFIG.WINDOW_SPAN_MS

      const THREE_DAYS = 3 * 24 * 60 * 60 * 1000
      const targetWatermarkTime = Math.min(
        now.getTime(),
        watermark + THREE_DAYS,
      )
      const targetWatermark = new Date(targetWatermarkTime)

      await this.sharepointService.fetchLogsStream(
        {
          startTime: new Date(watermark).toISOString(),
          endTime: targetWatermark.toISOString(),
        },
        async (files) => {
          await this.syncLockService.renewLock()
          await this.fileProcessor.processInBatches(
            files,
            SYNC_CONFIG.CONCURRENT_DOWNLOADS,
          )

          const maxTs = Math.max(
            ...files.map((f) => new Date(f.contentCreated).getTime()),
          )
          const lastFileTs = new Date(maxTs)

          if (!state) {
            state = this.syncStateRepo.create({
              key: SYNC_CONFIG.STATE_WATERMARK_KEY,
            })
          }
          state.value = lastFileTs
          await this.syncStateRepo.save(state)
        },
      )

      if (state) {
        state.value = targetWatermark
        await this.syncStateRepo.save(state)
      }
      this.logger.log(`Completed sync up to ${targetWatermark.toISOString()}`)
    } catch (error: any) {
      this.logger.error(
        'Cronjob failed to complete incremental sync',
        error.stack,
      )
    } finally {
      await this.syncLockService.release()
    }
  }

  /** Cron: Full reconciliation at 2:00 AM every Sunday */
  @Cron('0 21 * * 0')
  async handleReconciliationSync() {
    this.logger.log('Starting full reconciliation sync...')
    const locked = await this.syncLockService.acquire()
    if (!locked) return
    try {
      let state = await this.syncStateRepo.findOne({
        where: { key: SYNC_CONFIG.STATE_WATERMARK_KEY },
      })
      if (!state) {
        state = this.syncStateRepo.create({
          key: SYNC_CONFIG.STATE_WATERMARK_KEY,
        })
      }
      state.value = new Date(
        Date.now() - SYNC_CONFIG.RECONCILIATION_BACKFILL_MS,
      )
      await this.syncStateRepo.save(state)
    } finally {
      await this.syncLockService.release()
    }
    await this.handleIncrementalSync()
  }
}
