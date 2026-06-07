import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1780805252559 implements MigrationInterface {
    name = 'Migration1780805252559'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_profiles\` ADD \`hearts\` int NOT NULL DEFAULT '5'`);
        await queryRunner.query(`ALTER TABLE \`user_profiles\` ADD \`hearts_updated_at\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_profiles\` DROP COLUMN \`hearts_updated_at\``);
        await queryRunner.query(`ALTER TABLE \`user_profiles\` DROP COLUMN \`hearts\``);
    }

}
