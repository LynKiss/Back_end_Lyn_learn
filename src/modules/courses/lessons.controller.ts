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

@ApiTags('lessons')
@Controller('lessons')
export class LessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly exercisesService: ExercisesService,
    private readonly vocabularyService: VocabularyService,
  ) {}

  // Chi tiết bài học (kèm bài tập + từ vựng) — công khai.
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(id);
  }

  @Admin()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonsService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.lessonsService.remove(id);
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
