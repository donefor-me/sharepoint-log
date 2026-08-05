import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditLogDlq1785897002352 implements MigrationInterface {
  name = 'AddAuditLogDlq1785897002352'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_log_dlq" ("content_uri" character varying NOT NULL, "content_id" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'PENDING', "error_reason" text, "retry_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cdd4a2ea14b06297e630ee2cd88" PRIMARY KEY ("content_uri"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_log_dlq"`)
  }
}
