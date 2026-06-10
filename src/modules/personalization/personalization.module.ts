import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MistakeEvent } from './entities/mistake-event.entity';
import { UserSkillMastery } from './entities/user-skill-mastery.entity';
import { PersonalizedReviewItem } from './entities/personalized-review-item.entity';
import { PersonalizationService } from './personalization.service';
import { PersonalizationController } from './personalization.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MistakeEvent,
      UserSkillMastery,
      PersonalizedReviewItem,
    ]),
  ],
  providers: [PersonalizationService],
  controllers: [PersonalizationController],
  exports: [PersonalizationService],
})
export class PersonalizationModule {}
