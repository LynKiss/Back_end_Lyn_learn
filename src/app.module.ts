import { Module } from '@nestjs/common';
import { join } from 'path';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { ProgressModule } from './modules/progress/progress.module';
import { AdminModule } from './modules/admin/admin.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AiModule } from './modules/ai/ai.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { SrsModule } from './modules/srs/srs.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { LearningPathModule } from './modules/learning-path/learning-path.module';
import { WritingModule } from './modules/writing/writing.module';
import { SpeakingModule } from './modules/speaking/speaking.module';
import { PersonalizationModule } from './modules/personalization/personalization.module';
import { ConversationModule } from './modules/conversation/conversation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Giới hạn tần suất chống brute-force / lạm dụng: 120 request / phút / IP.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: config.get<boolean>('database.synchronize'),
        // Migration là nguồn chân lý ở production; tự áp dụng khi boot nếu bật.
        migrations: [join(__dirname, 'database', 'migrations', '*.{js,ts}')],
        migrationsRun: config.get<boolean>('database.migrationsRun'),
        logging: config.get<boolean>('database.logging'),
      }),
    }),
    AuthModule,
    UsersModule,
    CoursesModule,
    ProgressModule,
    AdminModule,
    MetadataModule,
    UploadsModule,
    AiModule,
    GamificationModule,
    SrsModule,
    ReviewsModule,
    LearningPathModule,
    WritingModule,
    SpeakingModule,
    PersonalizationModule,
    ConversationModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
