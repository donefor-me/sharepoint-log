import { MigrationInterface, QueryRunner } from 'typeorm'

export class SyncCurrentState1785832896367 implements MigrationInterface {
  name = 'SyncCurrentState1785832896367'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL, "contentId" character varying, "creationTime" character varying, "operation" character varying, "workload" character varying, "userId" character varying, "rawData" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "audit_log_sync_states" ("key" character varying NOT NULL, "value" TIMESTAMP, "lockedUntil" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0afddb8793daefe8e371a2a656d" PRIMARY KEY ("key"))`,
    )
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`)
    await queryRunner.query(`DROP TABLE "audit_log_sync_states"`)
    await queryRunner.query(`DROP TABLE "audit_logs"`)
  }
}
