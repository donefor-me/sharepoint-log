import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTrigramIndexToAuditLogs1786078042579 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;')
    await queryRunner.query(
      'CREATE INDEX audit_log_user_id_trgm_idx ON audit_log USING GIN (user_id gin_trgm_ops);',
    )
    await queryRunner.query(
      'CREATE INDEX audit_log_object_id_trgm_idx ON audit_log USING GIN (object_id gin_trgm_ops);',
    )
    await queryRunner.query(
      'CREATE INDEX audit_log_item_name_trgm_idx ON audit_log USING GIN (item_name gin_trgm_ops);',
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX audit_log_item_name_trgm_idx;')
    await queryRunner.query('DROP INDEX audit_log_object_id_trgm_idx;')
    await queryRunner.query('DROP INDEX audit_log_user_id_trgm_idx;')
    await queryRunner.query('DROP EXTENSION IF EXISTS pg_trgm;')
  }
}
