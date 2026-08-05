export const SYNC_CONFIG = {
  // Phase 1 — Initial backfill
  INITIAL_BACKFILL_DAYS: 7, // mốc xa nhất khi DB trắng
  CATCHUP_STEP_DAYS: 1, // cuốn chiếu từng ngày một (đúng theo yêu cầu task)

  // Phase 2 — Ongoing
  ZERO_LAG_MINUTES: 30, // safeNow = now - 30 phút, tránh miss log trễ vài phút từ Microsoft
  FORWARD_CRON_EXPRESSION: '*/30 * * * *', // lịch tick hiện tại của hệ thống

  // Phase 3 — Reconciliation (bắt delayed logs, tách biệt watermark chính)
  RECONCILIATION_LOOKBACK_DAYS: 7, // quét lùi tối đa 7 ngày, khớp SLA delay tối đa của Microsoft
  RECONCILIATION_INTERVAL_HOURS: 6, // tần suất chạy job reconciliation (độc lập với forward sync)

  MAX_RETRY_PER_ID: 5,

  // Additional DB & Performance configs
  DB_INSERT_CHUNK_SIZE: 1000,
  CONCURRENT_DOWNLOADS: 5,
  LOCK_TTL_MS: 30 * 60 * 1000,
  STATE_WATERMARK_KEY: 'sharepoint_audit_forward', // as specified in plan: this.watermarkRepo.get('sharepoint_audit_forward')
  LOCK_KEY: 'sharepoint_sync_lock',
} as const
