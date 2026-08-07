import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

/**
 * Generic key-value store for audit log synchronization state.
 *
 * This entity intentionally serves dual purposes to minimize table count:
 * - **Watermark row** (`key = 'sharepoint_watermark'`): Stores the last successful
 *   sync timestamp in `value`. The `lockedUntil` column is always null.
 * - **Lock row** (`key = 'sharepoint_sync_lock'`): Stores the lock expiry in
 *   `lockedUntil` for distributed pessimistic locking. The `value` column is always null.
 *
 * Both columns are nullable because each row only uses one of them.
 */
@Entity('audit_log_sync_states')
export class AuditLogSyncState {
  @PrimaryColumn()
  key: string

  @Column({ nullable: true })
  value?: Date

  @Column({ nullable: true })
  lockedUntil?: Date

  @UpdateDateColumn()
  updatedAt: Date
}
