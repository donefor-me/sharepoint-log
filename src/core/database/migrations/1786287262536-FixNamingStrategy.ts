import { MigrationInterface, QueryRunner } from 'typeorm'

export class FixNamingStrategy1786287262536 implements MigrationInterface {
  name = 'FixNamingStrategy1786287262536'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "contentId" TO "content_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "creationTime" TO "creation_time"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "userId" TO "user_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "rawData" TO "raw_data"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "createdAt" TO "created_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "objectId" TO "object_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_logs" RENAME COLUMN "itemName" TO "item_name"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" RENAME COLUMN "contentUri" TO "content_uri"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" RENAME COLUMN "contentId" TO "content_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" RENAME COLUMN "errorReason" TO "error_reason"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" RENAME COLUMN "retryCount" TO "retry_count"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" RENAME COLUMN "createdAt" TO "created_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" RENAME COLUMN "updatedAt" TO "updated_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_sync_states" RENAME COLUMN "lockedUntil" TO "locked_until"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_sync_states" RENAME COLUMN "updatedAt" TO "updated_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "sharepoint_token_cache" RENAME COLUMN "accessToken" TO "access_token"`,
    )
    await queryRunner.query(
      `ALTER TABLE "sharepoint_token_cache" RENAME COLUMN "tokenType" TO "token_type"`,
    )
    await queryRunner.query(
      `ALTER TABLE "sharepoint_token_cache" RENAME COLUMN "expiresIn" TO "expires_in"`,
    )
    await queryRunner.query(
      `ALTER TABLE "sharepoint_token_cache" RENAME COLUMN "calculatedExpiresAt" TO "calculated_expires_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "sharepoint_token_cache" RENAME COLUMN "updatedAt" TO "updated_at"`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sharepoint_token_cache" DROP COLUMN "updated_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "sharepoint_token_cache" DROP COLUMN "calculated_expires_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "sharepoint_token_cache" DROP COLUMN "expires_in"`,
    )
    await queryRunner.query(
      `ALTER TABLE "sharepoint_token_cache" DROP COLUMN "token_type"`,
    )
    await queryRunner.query(
      `ALTER TABLE "sharepoint_token_cache" DROP COLUMN "access_token"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_sync_states" DROP COLUMN "updated_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_sync_states" DROP COLUMN "locked_until"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" DROP COLUMN "updated_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" DROP COLUMN "created_at"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" DROP COLUMN "retry_count"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" DROP COLUMN "error_reason"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" DROP COLUMN "content_id"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_log_dlq" DROP COLUMN "content_uri"`,
    )
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "created_at"`)
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "raw_data"`)
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "item_name"`)
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "object_id"`)
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "user_id"`)
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "creation_time"`,
    )
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "content_id"`)
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "created_at" TO "createdAt"`,
    )
  }
}
