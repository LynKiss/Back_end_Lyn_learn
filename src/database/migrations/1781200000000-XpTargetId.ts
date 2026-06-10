import { MigrationInterface, QueryRunner } from 'typeorm';

export class XpTargetId1781200000000 implements MigrationInterface {
  name = 'XpTargetId1781200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`xp_events\` ADD \`target_id\` bigint UNSIGNED NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_xp_user_reason_target\` ON \`xp_events\` (\`user_id\`, \`reason\`, \`target_id\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_xp_user_reason_target\` ON \`xp_events\``);
    await queryRunner.query(`ALTER TABLE \`xp_events\` DROP COLUMN \`target_id\``);
  }
}
