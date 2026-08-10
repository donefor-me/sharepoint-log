import { MigrationInterface, QueryRunner } from 'typeorm'

export class RefactorAuditLog1786290942636 implements MigrationInterface {
  name = 'RefactorAuditLog1786290942636'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "creation_time"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "creation_time" TIMESTAMP`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_d39a760a1c914373a3d0949a85" ON "audit_logs"  ("creation_time") `,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_1c56ddf7e5d110ceb2211a9555" ON "audit_logs"  ("operation") `,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_9ab6c8da404926455a8b7df54b" ON "audit_logs"  ("workload") `,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON "audit_logs"  ("user_id") `,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_7fa9db7f461453c2412732d2da" ON "audit_logs"  ("creation_time", "operation") `,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7fa9db7f461453c2412732d2da"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd2726fd31b35443f2245b93ba"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9ab6c8da404926455a8b7df54b"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1c56ddf7e5d110ceb2211a9555"`,
    )
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d39a760a1c914373a3d0949a85"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "creation_time"`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "creation_time" character varying`,
    )
  }
}
