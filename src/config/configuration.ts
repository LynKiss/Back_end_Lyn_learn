const numberFromEnv = (value: string | undefined, fallback: number) =>
  parseInt(value ?? String(fallback), 10);

export default () => ({
  port: numberFromEnv(process.env.PORT, 3001),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  // Swagger: mặc định bật ở dev, tắt ở production; ghi đè bằng ENABLE_SWAGGER.
  enableSwagger: process.env.ENABLE_SWAGGER
    ? process.env.ENABLE_SWAGGER === 'true'
    : process.env.NODE_ENV !== 'production',

  database: {
    host: process.env.DB_HOST ?? process.env.MYSQLHOST ?? 'localhost',
    port: numberFromEnv(process.env.DB_PORT ?? process.env.MYSQLPORT, 3306),
    username: process.env.DB_USERNAME ?? process.env.MYSQLUSER ?? 'root',
    password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? '',
    name: process.env.DB_NAME ?? process.env.MYSQLDATABASE ?? 'web_lyn',
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
    supportBotTimeoutMs: numberFromEnv(process.env.SUPPORT_BOT_TIMEOUT_MS, 10000),
    openaiApiKey: process.env.OPENAI_API_KEY ?? process.env.WHISPER_API_KEY ?? '',
    openaiTranscribeModel:
      process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-mini-transcribe',
    whisperApiKey: process.env.WHISPER_API_KEY ?? '',
  },

  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxBytes: numberFromEnv(process.env.UPLOAD_MAX_BYTES, 26214400),
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? process.env.CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? process.env.API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? process.env.API_SECRET ?? '',
    folder: process.env.CLOUDINARY_FOLDER ?? 'web_lyn',
  },
});
