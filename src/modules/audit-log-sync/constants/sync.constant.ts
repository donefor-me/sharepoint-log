export const SYNC_CONFIG = {
  /** Database & Performance: Number of records inserted per batch */
  DB_INSERT_CHUNK_SIZE: 1000,
  /** Number of concurrent file downloads */
  CONCURRENT_DOWNLOADS: 5,

  /** Overlap window to catch delayed logs from Microsoft (1 hour) */
  OVERLAP_WINDOW_MS: 60 * 60 * 1000,
  /** Length of each log scanning window (24 hours) */
  WINDOW_SPAN_MS: 24 * 60 * 60 * 1000,
  /** Maximum backfill time for full reconciliation (7 days) */
  RECONCILIATION_BACKFILL_MS: 7 * 24 * 60 * 60 * 1000,
  /** Time-To-Live (TTL) for the synchronization lock to prevent permanent hangs (30 minutes) */
  LOCK_TTL_MS: 30 * 60 * 1000,

  /** Key for storing the synchronized time watermark in the database */
  STATE_WATERMARK_KEY: 'sharepoint_watermark',
  /** Key used for the Distributed Lock mechanism in the database */
  LOCK_KEY: 'sharepoint_sync_lock',
} as const
