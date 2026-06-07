// Cấu hình tập trung, đọc từ biến môi trường (.env)
export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',

  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'web_lyn',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
    supportBotApiKey: process.env.SUPPORT_BOT_API_KEY ?? '',
    supportBotModel: process.env.SUPPORT_BOT_MODEL ?? 'gemini-2.5-flash',
    supportBotApiBaseUrl:
      process.env.SUPPORT_BOT_API_BASE_URL ??
      'https://generativelanguage.googleapis.com/v1beta/openai',
    supportBotTimeoutMs: parseInt(
      process.env.SUPPORT_BOT_TIMEOUT_MS ?? '10000',
      10,
    ),
    openaiApiKey: process.env.OPENAI_API_KEY ?? process.env.WHISPER_API_KEY ?? '',
    openaiTranscribeModel:
      process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-mini-transcribe',
    whisperApiKey: process.env.WHISPER_API_KEY ?? '',
  },

  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxBytes: parseInt(process.env.UPLOAD_MAX_BYTES ?? '26214400', 10),
  },
});
