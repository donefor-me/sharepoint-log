import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLockedUntil1786287174489 implements MigrationInterface {
  name = 'AddLockedUntil1786287174489'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."audit_log_dlq_status_enum" AS ENUM('PENDING', 'DONE', 'DLQ')`,
    )
    await queryRunner.query(
      `CREATE TABLE "audit_log_dlq" ("contentUri" character varying NOT NULL, "contentId" character varying NOT NULL, "status" "public"."audit_log_dlq_status_enum" NOT NULL DEFAULT 'PENDING', "errorReason" text, "retryCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_53d189c32a77fd39434e2738d7a" PRIMARY KEY ("contentUri"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_log_dlq"`)
    await queryRunner.query(`DROP TYPE "public"."audit_log_dlq_status_enum"`)
  }
}
