import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { GamificationModule } from '../gamification/gamification.module';
import { PersonalizationModule } from '../personalization/personalization.module';
import { ConversationSession } from './entities/conversation-session.entity';
import { ConversationTurn } from './entities/conversation-turn.entity';
import { SpeakingTurnFeedback } from './entities/speaking-turn-feedback.entity';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationSession,
      ConversationTurn,
      SpeakingTurnFeedback,
    ]),
    AiModule,
    UsersModule,
    GamificationModule,
    PersonalizationModule,
  ],
  providers: [ConversationService],
  controllers: [ConversationController],
})
export class ConversationModule {}
