import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLog1781400000000 implements MigrationInterface {
  name = 'AuditLog1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`audit_logs\` (
      \`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`actor_id\` bigint UNSIGNED NULL,
      \`action\` varchar(64) NOT NULL,
      \`entity_type\` varchar(40) NOT NULL,
      \`entity_id\` varchar(40) NULL,
      \`before\` json NULL,
      \`after\` json NULL,
      INDEX \`IDX_audit_actor\` (\`actor_id\`),
      INDEX \`IDX_audit_entity\` (\`entity_type\`),
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`audit_logs\``);
  }
}
