import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';

loadEnv();

const numberFromEnv = (value: string | undefined, fallback: number) =>
  parseInt(value ?? String(fallback), 10);

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? process.env.MYSQLHOST ?? 'localhost',
  port: numberFromEnv(process.env.DB_PORT ?? process.env.MYSQLPORT, 3306),
  username: process.env.DB_USERNAME ?? process.env.MYSQLUSER ?? 'root',
  password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? '',
  database: process.env.DB_NAME ?? process.env.MYSQLDATABASE ?? 'web_lyn',
  entities: ['src/**/*.entity.{ts,js}'],
  migrations: ['src/database/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
