import { MigrationInterface, QueryRunner } from 'typeorm'

export class Init1785467085280 implements MigrationInterface {
  name = 'Init1785467085280'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
    await queryRunner.query(
      `CREATE TABLE "sharepoint_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" character varying NOT NULL, "details" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1ce6a57fe03daf47d1b8d2fae3f" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sharepoint_log"`)
  }
}
