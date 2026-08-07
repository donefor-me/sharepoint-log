import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditLogColumns1785853699970 implements MigrationInterface {
  name = 'AddAuditLogColumns1785853699970'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "objectId" character varying`,
    )
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "itemName" character varying`,
    )

    await queryRunner.query(`
            UPDATE "audit_logs" 
            SET "objectId" = "rawData"->>'ObjectId', 
                "itemName" = "rawData"->>'ItemName' 
            WHERE "objectId" IS NULL AND "itemName" IS NULL
        `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "itemName"`)
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "objectId"`)
  }
}
