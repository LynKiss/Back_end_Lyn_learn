import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { LessonProgress } from './entities/lesson-progress.entity';
import { ExerciseAttempt } from './entities/exercise-attempt.entity';
import { Unit } from '../courses/entities/unit.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { CoursesModule } from '../courses/courses.module';
import { GamificationModule } from '../gamification/gamification.module';
import { LearningPathModule } from '../learning-path/learning-path.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, LessonProgress, ExerciseAttempt, Unit]),
    CoursesModule,
    GamificationModule,
    LearningPathModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
