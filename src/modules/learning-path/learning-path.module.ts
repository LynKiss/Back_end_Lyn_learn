import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { GamificationModule } from '../gamification/gamification.module';
import { PersonalizationModule } from '../personalization/personalization.module';
import { LearningPathController } from './learning-path.controller';
import { LearningPathService } from './learning-path.service';
import { LearningPath } from './entities/learning-path.entity';
import { LearningPathItem } from './entities/learning-path-item.entity';
import { PlacementResult } from './entities/placement-result.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlacementResult, LearningPath, LearningPathItem, Course, User]),
    GamificationModule,
    PersonalizationModule,
  ],
  controllers: [LearningPathController],
  providers: [LearningPathService],
  exports: [LearningPathService],
})
export class LearningPathModule {}
