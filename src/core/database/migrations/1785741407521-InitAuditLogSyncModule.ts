import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitAuditLogSyncModule1785741407521 implements MigrationInterface {
  name = 'InitAuditLogSyncModule1785741407521'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sharepoint_logs" ("id" uuid NOT NULL, "creationTime" character varying, "operation" character varying, "workload" character varying, "userId" character varying, "rawData" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f78eb101677a1c30e5cb181c2d4" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."sharepoint_content_blobs_status_enum" AS ENUM('PENDING_DOWNLOAD', 'DOWNLOADED_SUCCESS', 'DOWNLOAD_FAILED')`,
    )
    await queryRunner.query(
      `CREATE TABLE "sharepoint_content_blobs" ("contentId" character varying NOT NULL, "contentUri" character varying NOT NULL, "contentType" character varying NOT NULL, "status" "public"."sharepoint_content_blobs_status_enum" NOT NULL DEFAULT 'PENDING_DOWNLOAD', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9d5e2e79d7c0e046eac81889c3c" PRIMARY KEY ("contentId"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sharepoint_content_blobs"`)
    await queryRunner.query(
      `DROP TYPE "public"."sharepoint_content_blobs_status_enum"`,
    )
    await queryRunner.query(`DROP TABLE "sharepoint_logs"`)
  }
}
