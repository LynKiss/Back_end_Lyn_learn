import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { UnitsService } from './units.service';
import { uniqueSlug } from '../../common/utils/slug';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonsRepo: Repository<Lesson>,
    private readonly unitsService: UnitsService,
  ) {}

  async create(unitId: string, dto: CreateLessonDto): Promise<Lesson> {
    await this.unitsService.findById(unitId);
    const lesson = this.lessonsRepo.create({
      ...dto,
      unitId,
      slug: uniqueSlug(dto.title),
    });
    return this.lessonsRepo.save(lesson);
  }

  // Chi tiết bài học kèm bài tập + từ vựng.
  async findOne(id: string): Promise<Lesson> {
    const lesson = await this.lessonsRepo.findOne({
      where: { id },
      relations: { exercises: true, vocabulary: true },
      order: { exercises: { orderIndex: 'ASC' } },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');
    return lesson;
  }

  async findById(id: string): Promise<Lesson> {
    const lesson = await this.lessonsRepo.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');
    return lesson;
  }

  async update(id: string, dto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.findById(id);
    Object.assign(lesson, dto);
    return this.lessonsRepo.save(lesson);
  }

  async remove(id: string): Promise<void> {
    const result = await this.lessonsRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Không tìm thấy bài học');
  }
}
