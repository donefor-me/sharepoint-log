import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameAuditLogEntities1785753134072 implements MigrationInterface {
  name = 'RenameAuditLogEntities1785753134072'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('sharepoint_logs')
    if (tableExists) {
      await queryRunner.query(
        `ALTER TABLE "sharepoint_logs" RENAME TO "audit_logs"`,
      )
      await queryRunner.query(
        `ALTER TABLE "sharepoint_content_blobs" RENAME TO "audit_log_content_blobs"`,
      )
      await queryRunner.query(
        `ALTER TABLE "sync_states" RENAME TO "audit_log_sync_states"`,
      )
      await queryRunner.query(
        `ALTER TYPE "public"."sharepoint_content_blobs_status_enum" RENAME TO "audit_log_content_blobs_status_enum"`,
      )
    } else {
      await queryRunner.query(
        `CREATE TABLE "audit_logs" ("id" uuid NOT NULL, "contentId" character varying, "creationTime" character varying, "operation" character varying, "workload" character varying, "userId" character varying, "rawData" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
      )
      await queryRunner.query(
        `CREATE TYPE "public"."audit_log_content_blobs_status_enum" AS ENUM('PENDING_DOWNLOAD', 'DOWNLOADED_SUCCESS', 'DOWNLOAD_FAILED')`,
      )
      await queryRunner.query(
        `CREATE TABLE "audit_log_content_blobs" ("contentId" character varying NOT NULL, "contentUri" character varying NOT NULL, "contentType" character varying NOT NULL, "status" "public"."audit_log_content_blobs_status_enum" NOT NULL DEFAULT 'PENDING_DOWNLOAD', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_09ec7180bbeee48979e0efa5fca" PRIMARY KEY ("contentId"))`,
      )
      await queryRunner.query(
        `CREATE TABLE "audit_log_sync_states" ("key" character varying NOT NULL, "value" TIMESTAMP, "lockedUntil" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0afddb8793daefe8e371a2a656d" PRIMARY KEY ("key"))`,
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('audit_logs')
    const oldTableExists = await queryRunner.hasTable('sharepoint_logs')
    if (tableExists && !oldTableExists) {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" RENAME TO "sharepoint_logs"`,
      )
      await queryRunner.query(
        `ALTER TABLE "audit_log_content_blobs" RENAME TO "sharepoint_content_blobs"`,
      )
      await queryRunner.query(
        `ALTER TABLE "audit_log_sync_states" RENAME TO "sync_states"`,
      )
      await queryRunner.query(
        `ALTER TYPE "public"."audit_log_content_blobs_status_enum" RENAME TO "sharepoint_content_blobs_status_enum"`,
      )
    } else {
      await queryRunner.query(`DROP TABLE "audit_log_sync_states"`)
      await queryRunner.query(`DROP TABLE "audit_log_content_blobs"`)
      await queryRunner.query(
        `DROP TYPE "public"."audit_log_content_blobs_status_enum"`,
      )
      await queryRunner.query(`DROP TABLE "audit_logs"`)
    }
  }
}
