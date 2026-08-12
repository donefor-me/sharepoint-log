import { Column, Entity } from 'typeorm'

import { AbstractEntity } from '../../../../common/entities/abstract.entity'

/**
 * Generic key-value store for audit log synchronization state.
 *
 * This entity intentionally serves dual purposes to minimize table count:
 * - **Watermark row** (`key = SYNC_CONFIG.STATE_WATERMARK_KEY`): Stores the last successful
 *   sync timestamp in `value`. The `lockedUntil` column is always null.
 * - **Lock row** (`key = SYNC_CONFIG.LOCK_KEY`): Stores the lock expiry in
 *   `lockedUntil` for distributed pessimistic locking. The `value` column is always null.
 *
 * Both columns are nullable because each row only uses one of them.
 */
@Entity('audit_log_sync_states')
export class AuditLogSyncState extends AbstractEntity {
  @Column({ unique: true })
  key: string

  @Column({ type: 'timestamp', nullable: true })
  value: Date | null

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date | null
}
