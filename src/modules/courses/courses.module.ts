import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { Unit } from './entities/unit.entity';
import { Lesson } from './entities/lesson.entity';
import { Exercise } from './entities/exercise.entity';
import { Vocabulary } from './entities/vocabulary.entity';
import { Category } from './entities/category.entity';
import { CoursesService } from './courses.service';
import { UnitsService } from './units.service';
import { LessonsService } from './lessons.service';
import { ExercisesService } from './exercises.service';
import { VocabularyService } from './vocabulary.service';
import { CategoriesService } from './categories.service';
import { CoursesController } from './courses.controller';
import { UnitsController } from './units.controller';
import { LessonsController } from './lessons.controller';
import { ExercisesController } from './exercises.controller';
import { VocabularyController } from './vocabulary.controller';
import { CategoriesController } from './categories.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      Unit,
      Lesson,
      Exercise,
      Vocabulary,
      Category,
    ]),
    AuditModule,
  ],
  controllers: [
    CoursesController,
    UnitsController,
    LessonsController,
    ExercisesController,
    VocabularyController,
    CategoriesController,
  ],
  providers: [
    CoursesService,
    UnitsService,
    LessonsService,
    ExercisesService,
    VocabularyService,
    CategoriesService,
  ],
  exports: [CoursesService, LessonsService, ExercisesService],
})
export class CoursesModule {}
