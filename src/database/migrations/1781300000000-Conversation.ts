import { MigrationInterface, QueryRunner } from 'typeorm';

export class Conversation1781300000000 implements MigrationInterface {
  name = 'Conversation1781300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`ai_conversation_sessions\` (
      \`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`user_id\` bigint UNSIGNED NOT NULL,
      \`scenario\` varchar(32) NOT NULL,
      \`target_language\` varchar(8) NOT NULL,
      \`title\` varchar(160) NOT NULL,
      \`status\` varchar(16) NOT NULL DEFAULT 'active',
      \`summary\` json NULL,
      \`finished_at\` datetime NULL,
      INDEX \`IDX_conv_user\` (\`user_id\`),
      INDEX \`IDX_conv_status\` (\`status\`),
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE \`ai_conversation_turns\` (
      \`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`session_id\` bigint UNSIGNED NOT NULL,
      \`role\` varchar(16) NOT NULL,
      \`text\` text NOT NULL,
      \`audio_url\` varchar(512) NULL,
      INDEX \`IDX_turn_session\` (\`session_id\`),
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE \`speaking_turn_feedback\` (
      \`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`turn_id\` bigint UNSIGNED NOT NULL,
      \`pronunciation_score\` int NOT NULL DEFAULT '0',
      \`fluency_score\` int NOT NULL DEFAULT '0',
      \`grammar_score\` int NOT NULL DEFAULT '0',
      \`vocabulary_score\` int NOT NULL DEFAULT '0',
      \`naturalness_score\` int NOT NULL DEFAULT '0',
      \`task_completion_score\` int NOT NULL DEFAULT '0',
      \`corrections\` json NULL,
      UNIQUE INDEX \`UQ_turn_feedback\` (\`turn_id\`),
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`speaking_turn_feedback\``);
    await queryRunner.query(`DROP TABLE \`ai_conversation_turns\``);
    await queryRunner.query(`DROP TABLE \`ai_conversation_sessions\``);
  }
}
