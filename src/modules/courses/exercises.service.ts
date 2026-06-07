import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from './entities/exercise.entity';
import { CreateExerciseDto, UpdateExerciseDto } from './dto/exercise.dto';
import { LessonsService } from './lessons.service';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private readonly exercisesRepo: Repository<Exercise>,
    private readonly lessonsService: LessonsService,
  ) {}

  async create(lessonId: string, dto: CreateExerciseDto): Promise<Exercise> {
    await this.lessonsService.findById(lessonId);
    const exercise = this.exercisesRepo.create({ ...dto, lessonId });
    return this.exercisesRepo.save(exercise);
  }

  async findById(id: string): Promise<Exercise> {
    const exercise = await this.exercisesRepo.findOne({ where: { id } });
    if (!exercise) throw new NotFoundException('Không tìm thấy bài tập');
    return exercise;
  }

  async update(id: string, dto: UpdateExerciseDto): Promise<Exercise> {
    const exercise = await this.findById(id);
    Object.assign(exercise, dto);
    return this.exercisesRepo.save(exercise);
  }

  async remove(id: string): Promise<void> {
    const result = await this.exercisesRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Không tìm thấy bài tập');
  }
}
