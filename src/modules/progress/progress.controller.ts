import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import {
  CompleteLessonDto,
  EnrollDto,
  SubmitAttemptDto,
} from './dto/progress.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('progress')
@Auth()
@Controller()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('enrollments')
  enroll(@CurrentUser('id') userId: string, @Body() dto: EnrollDto) {
    return this.progressService.enroll(userId, dto.courseId);
  }

  @Get('enrollments')
  myEnrollments(@CurrentUser('id') userId: string) {
    return this.progressService.myEnrollments(userId);
  }

  @Post('progress/lessons/:lessonId/start')
  startLesson(
    @CurrentUser('id') userId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.progressService.startLesson(userId, lessonId);
  }

  @Post('progress/lessons/:lessonId/complete')
  completeLesson(
    @CurrentUser('id') userId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: CompleteLessonDto,
  ) {
    return this.progressService.completeLesson(userId, lessonId, dto.score);
  }

  @Get('progress/courses/:courseId')
  courseProgress(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.progressService.getCourseProgress(userId, courseId);
  }

  @Post('progress/exercises/:exerciseId/attempts')
  submitAttempt(
    @CurrentUser('id') userId: string,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.progressService.submitAttempt(userId, exerciseId, dto.answer);
  }
}
