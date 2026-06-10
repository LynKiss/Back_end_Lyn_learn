import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { ExercisesService } from './exercises.service';
import { VocabularyService } from './vocabulary.service';
import { UpdateLessonDto } from './dto/lesson.dto';
import { CreateExerciseDto } from './dto/exercise.dto';
import { CreateVocabularyDto } from './dto/vocabulary.dto';
import { Admin } from '../../common/decorators/admin.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@ApiTags('lessons')
@Controller('lessons')
export class LessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly exercisesService: ExercisesService,
    private readonly vocabularyService: VocabularyService,
    private readonly audit: AuditService,
  ) {}

  // Chi tiết bài học (kèm bài tập + từ vựng) — công khai.
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(id);
  }

  @Admin()
  @Patch(':id')
  async update(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    const updated = await this.lessonsService.update(id, dto);
    await this.audit.record({
      actorId,
      action: dto.isPublished === true ? 'lesson.publish' : 'lesson.update',
      entityType: 'lesson',
      entityId: id,
      after: { isPublished: updated.isPublished, title: updated.title },
    });
    return updated;
  }

  @Admin()
  @Get(':id/validate-publish')
  validatePublish(@Param('id') id: string) {
    return this.lessonsService.validatePublish(id);
  }

  @Admin()
  @Delete(':id')
  async remove(@CurrentUser('id') actorId: string, @Param('id') id: string) {
    await this.lessonsService.remove(id);
    await this.audit.record({
      actorId,
      action: 'lesson.delete',
      entityType: 'lesson',
      entityId: id,
    });
  }

  @Admin()
  @Post(':lessonId/exercises')
  createExercise(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateExerciseDto,
  ) {
    return this.exercisesService.create(lessonId, dto);
  }

  @Admin()
  @Post(':lessonId/vocabulary')
  createVocabulary(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateVocabularyDto,
  ) {
    return this.vocabularyService.create(lessonId, dto);
  }
}
