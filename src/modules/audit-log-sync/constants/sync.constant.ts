export const SYNC_CONFIG = {
  // Phase 1 — Initial backfill
  INITIAL_BACKFILL_DAYS: 7, // Max past days to sync for an empty DB
  CATCHUP_STEP_DAYS: 1, // Step size to process historical data day-by-day

  // Phase 2 — Ongoing
  ZERO_LAG_MINUTES: 30, // Buffer (safeNow) to prevent missing delayed logs from Microsoft
  FORWARD_CRON_EXPRESSION: '*/30 * * * *', // System cron schedule for ongoing sync

  // Phase 3 — Reconciliation (Catches severely delayed logs, independent of main watermark)
  RECONCILIATION_LOOKBACK_DAYS: 7, // Lookback period matching Microsoft's max delay SLA
  RECONCILIATION_INTERVAL_HOURS: 6, // Execution frequency for the reconciliation job

  MAX_RETRY_PER_ID: 5,

  // Additional DB & Performance configs
  DB_INSERT_CHUNK_SIZE: 1000,
  CONCURRENT_DOWNLOADS: 5,
  LOCK_TTL_MS: 30 * 60 * 1000,
  STATE_WATERMARK_KEY: 'sharepoint_audit_forward', // Key for tracking ongoing sync state
  LOCK_KEY: 'sharepoint_sync_lock',
} as const
