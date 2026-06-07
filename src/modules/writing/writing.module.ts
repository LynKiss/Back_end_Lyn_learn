import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { GamificationModule } from '../gamification/gamification.module';
import { WritingFeedback } from './entities/writing-feedback.entity';
import { WritingSubmission } from './entities/writing-submission.entity';
import { WritingController } from './writing.controller';
import { WritingService } from './writing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WritingSubmission, WritingFeedback]),
    AiModule,
    UsersModule,
    GamificationModule,
  ],
  controllers: [WritingController],
  providers: [WritingService],
})
export class WritingModule {}
