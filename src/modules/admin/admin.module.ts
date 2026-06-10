import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { Exercise } from '../courses/entities/exercise.entity';
import { Vocabulary } from '../courses/entities/vocabulary.entity';
import { Enrollment } from '../progress/entities/enrollment.entity';
import { WritingSubmission } from '../writing/entities/writing-submission.entity';
import { SpeakingSubmission } from '../speaking/entities/speaking-submission.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Course,
      Lesson,
      Exercise,
      Vocabulary,
      Enrollment,
      WritingSubmission,
      SpeakingSubmission,
    ]),
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
