import { MigrationInterface, QueryRunner } from 'typeorm'

export class InfraTablesWithWatermarkMigration1788151797254 implements MigrationInterface {
  name = 'InfraTablesWithWatermarkMigration1788151797254'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create infra_distributed_locks
    await queryRunner.query(
      `CREATE TABLE "infra_distributed_locks" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "key" character varying NOT NULL, "locked_until" TIMESTAMP, "owner_id" uuid, CONSTRAINT "UQ_143b14b0bd625050c2b14ad483a" UNIQUE ("key"), CONSTRAINT "PK_053ae8456e0d098a564abc6792a" PRIMARY KEY ("id"))`,
    )

    // 2. Create infra_watermarks
    await queryRunner.query(
      `CREATE TABLE "infra_watermarks" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "key" character varying(100) NOT NULL, "timestamp_value" TIMESTAMP, CONSTRAINT "UQ_0c48bcd1910bce3b7c1ffcb3abe" UNIQUE ("key"), CONSTRAINT "PK_9a9a760e4b778000aa41fd1e738" PRIMARY KEY ("id"))`,
    )

    // 3. DATA MIGRATION: copy watermark from old table (value IS NOT NULL = watermark rows)
    await queryRunner.query(`
      INSERT INTO "infra_watermarks" ("key", "timestamp_value", "created_at", "updated_at")
      SELECT "key", "value", "created_at", "updated_at"
      FROM "audit_log_sync_states"
      WHERE "value" IS NOT NULL
      ON CONFLICT ("key") DO NOTHING
    `)

    // 4. DATA MIGRATION: copy any active lock row (locked_until IS NOT NULL) so an in-flight lock survives the deploy
    await queryRunner.query(`
      INSERT INTO "infra_distributed_locks" ("key", "locked_until", "created_at", "updated_at")
      SELECT "key", "locked_until", "created_at", "updated_at"
      FROM "audit_log_sync_states"
      WHERE "locked_until" IS NOT NULL
      ON CONFLICT ("key") DO NOTHING
    `)

    // 5. DROP old combined table
    await queryRunner.query(`DROP TABLE "audit_log_sync_states"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore old table
    await queryRunner.query(
      `CREATE TABLE "audit_log_sync_states" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "key" character varying NOT NULL, "value" TIMESTAMP, "locked_until" TIMESTAMP, CONSTRAINT "UQ_0afddb8793daefe8e371a2a656d" UNIQUE ("key"), CONSTRAINT "PK_f37a599997ab773b111ae44b69f" PRIMARY KEY ("id"))`,
    )

    // Restore watermark data
    await queryRunner.query(`
      INSERT INTO "audit_log_sync_states" ("key", "value", "created_at", "updated_at")
      SELECT "key", "timestamp_value", "created_at", "updated_at"
      FROM "infra_watermarks"
      ON CONFLICT ("key") DO NOTHING
    `)

    // Restore lock data (merges locked_until onto an existing row or inserts a new one)
    await queryRunner.query(`
      INSERT INTO "audit_log_sync_states" ("key", "locked_until", "created_at", "updated_at")
      SELECT "key", "locked_until", "created_at", "updated_at"
      FROM "infra_distributed_locks"
      ON CONFLICT ("key") DO UPDATE SET "locked_until" = EXCLUDED."locked_until"
    `)

    await queryRunner.query(`DROP TABLE "infra_watermarks"`)
    await queryRunner.query(`DROP TABLE "infra_distributed_locks"`)
  }
}
