import { MigrationInterface, QueryRunner } from 'typeorm';

export class Personalization1781100000000 implements MigrationInterface {
  name = 'Personalization1781100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`mistake_events\` (
      \`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`user_id\` bigint UNSIGNED NOT NULL,
      \`exercise_id\` bigint UNSIGNED NULL,
      \`lesson_id\` bigint UNSIGNED NULL,
      \`vocabulary_id\` bigint UNSIGNED NULL,
      \`skill\` varchar(32) NOT NULL,
      \`mistake_type\` varchar(32) NOT NULL,
      \`target_text\` text NULL,
      \`user_answer\` text NULL,
      \`correct_answer\` text NULL,
      \`severity\` int NOT NULL DEFAULT '1',
      INDEX \`IDX_mistake_user\` (\`user_id\`),
      INDEX \`IDX_mistake_skill\` (\`skill\`),
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE \`user_skill_mastery\` (
      \`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`user_id\` bigint UNSIGNED NOT NULL,
      \`skill\` varchar(32) NOT NULL,
      \`mastery_score\` int NOT NULL DEFAULT '50',
      \`attempts\` int NOT NULL DEFAULT '0',
      \`mistakes\` int NOT NULL DEFAULT '0',
      \`last_practiced_at\` datetime NULL,
      \`recommended_review_at\` datetime NULL,
      \`weak_patterns\` json NULL,
      INDEX \`IDX_mastery_user\` (\`user_id\`),
      UNIQUE INDEX \`UQ_mastery_user_skill\` (\`user_id\`, \`skill\`),
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE \`personalized_review_items\` (
      \`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`user_id\` bigint UNSIGNED NOT NULL,
      \`skill\` varchar(32) NOT NULL,
      \`source_type\` varchar(16) NOT NULL,
      \`mistake_type\` varchar(32) NULL,
      \`exercise_id\` bigint UNSIGNED NULL,
      \`lesson_id\` bigint UNSIGNED NULL,
      \`vocabulary_id\` bigint UNSIGNED NULL,
      \`prompt\` text NOT NULL,
      \`correct_answer\` text NULL,
      \`status\` varchar(16) NOT NULL DEFAULT 'pending',
      \`due_at\` datetime NOT NULL,
      \`resolved_at\` datetime NULL,
      INDEX \`IDX_pri_user\` (\`user_id\`),
      INDEX \`IDX_pri_status\` (\`status\`),
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`personalized_review_items\``);
    await queryRunner.query(`DROP TABLE \`user_skill_mastery\``);
    await queryRunner.query(`DROP TABLE \`mistake_events\``);
  }
}
