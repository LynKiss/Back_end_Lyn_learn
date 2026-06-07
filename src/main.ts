import { webcrypto } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

async function bootstrap() {
  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  if (process.env.NODE_ENV === 'production') {
    const access = config.get<string>('jwt.accessSecret') ?? '';
    const refresh = config.get<string>('jwt.refreshSecret') ?? '';
    const weak = (secret: string) =>
      !secret ||
      secret.length < 24 ||
      secret.includes('change-me') ||
      secret.includes('dev-');
    if (weak(access) || weak(refresh)) {
      throw new Error(
        'Weak JWT secret. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to random strings with at least 24 characters.',
      );
    }
  }

  const apiPrefix = config.get<string>('apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: config.get<string>('corsOrigin', 'http://localhost:3000'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const uploadDir = join(process.cwd(), config.get<string>('uploads.dir', 'uploads'));
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Web_Lyn API')
    .setDescription('AI language learning platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = config.get<number>('port', 3001);
  await app.listen(port);
  console.log(`API running at http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
