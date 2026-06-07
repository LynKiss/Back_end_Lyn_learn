import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { GamificationModule } from '../gamification/gamification.module';
import { SpeakingFeedback } from './entities/speaking-feedback.entity';
import { SpeakingSubmission } from './entities/speaking-submission.entity';
import { SpeakingController } from './speaking.controller';
import { SpeakingService } from './speaking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpeakingSubmission, SpeakingFeedback]),
    AiModule,
    UsersModule,
    GamificationModule,
  ],
  controllers: [SpeakingController],
  providers: [SpeakingService],
})
export class SpeakingModule {}
