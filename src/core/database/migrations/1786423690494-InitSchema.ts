import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitSchema1786423690494 implements MigrationInterface {
  name = 'InitSchema1786423690494'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "microsoft_id" character varying NOT NULL, "content_id" character varying, "creation_time" TIMESTAMP, "operation" character varying, "workload" character varying, "user_id" character varying, "object_id" character varying, "item_name" character varying, "raw_data" jsonb, CONSTRAINT "UQ_b142531b21da3c61930446c36f6" UNIQUE ("microsoft_id"), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_d39a760a1c914373a3d0949a85" ON "audit_logs" ("creation_time") `,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON "audit_logs" ("user_id") `,
    )
    await queryRunner.query(
      `CREATE TYPE "public"."audit_log_dlq_status_enum" AS ENUM('PENDING', 'DONE', 'DLQ')`,
    )
    await queryRunner.query(
      `CREATE TABLE "audit_log_dlq" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "content_uri" character varying NOT NULL, "content_id" character varying NOT NULL, "status" "public"."audit_log_dlq_status_enum" NOT NULL DEFAULT 'PENDING', "error_reason" text, "retry_count" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_cdd4a2ea14b06297e630ee2cd88" UNIQUE ("content_uri"), CONSTRAINT "PK_1e62a893b798b160e3836196ba6" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "audit_log_sync_states" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "key" character varying NOT NULL, "value" TIMESTAMP, "locked_until" TIMESTAMP, CONSTRAINT "UQ_0afddb8793daefe8e371a2a656d" UNIQUE ("key"), CONSTRAINT "PK_f37a599997ab773b111ae44b69f" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "sharepoint_token_cache" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "access_token" text NOT NULL, "token_type" character varying(50) NOT NULL, "expires_in" integer NOT NULL, "calculated_expires_at" bigint NOT NULL, CONSTRAINT "PK_7117ffcbbb9ec737e30433914a2" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "username" character varying NOT NULL, "password" character varying NOT NULL, CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`)
    await queryRunner.query(`DROP TABLE "sharepoint_token_cache"`)
    await queryRunner.query(`DROP TABLE "audit_log_sync_states"`)
    await queryRunner.query(`DROP TABLE "audit_log_dlq"`)
    await queryRunner.query(`DROP TYPE "public"."audit_log_dlq_status_enum"`)
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd2726fd31b35443f2245b93ba"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d39a760a1c914373a3d0949a85"`,
    )
    await queryRunner.query(`DROP TABLE "audit_logs"`)
  }
}
