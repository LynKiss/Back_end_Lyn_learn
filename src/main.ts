import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Bảo mật: ở production không cho chạy với secret JWT mặc định.
  if (process.env.NODE_ENV === 'production') {
    const access = config.get<string>('jwt.accessSecret') ?? '';
    const refresh = config.get<string>('jwt.refreshSecret') ?? '';
    const weak = (s: string) => !s || s.length < 24 || s.includes('change-me') || s.includes('dev-');
    if (weak(access) || weak(refresh)) {
      throw new Error(
        'JWT secret yếu/mặc định. Đặt JWT_ACCESS_SECRET & JWT_REFRESH_SECRET (chuỗi ngẫu nhiên ≥24 ký tự) trước khi deploy.',
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

  // Swagger tại /api/v1/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Web_Lyn API')
    .setDescription('API nền tảng học ngoại ngữ tích hợp AI')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = config.get<number>('port', 3001);
  await app.listen(port);
  console.log(`🚀 API chạy tại http://localhost:${port}/${apiPrefix}`);
}
bootstrap();
