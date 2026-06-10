import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { UnitsService } from './units.service';
import { uniqueSlug } from '../../common/utils/slug';

const AI_TYPES = ['speaking', 'writing'];

// Kiểm tra dữ liệu bài học đủ điều kiện xuất bản; trả danh sách vấn đề.
export function validateLessonForPublish(lesson: Lesson): string[] {
  const issues: string[] = [];
  const content = (lesson.content ?? {}) as { objectives?: unknown };
  if (!Array.isArray(content.objectives) || content.objectives.length === 0) {
    issues.push('Bài học thiếu mục tiêu (objectives)');
  }
  const exercises = lesson.exercises ?? [];
  const seen = new Set<number>();
  for (const ex of exercises) {
    if (!AI_TYPES.includes(ex.type) && (ex.answer == null)) {
      issues.push(`Bài tập "${ex.prompt?.slice(0, 30) ?? ex.id}" thiếu đáp án`);
    }
    if (seen.has(ex.orderIndex)) {
      issues.push(`Trùng orderIndex (${ex.orderIndex}) trong bài tập`);
    }
    seen.add(ex.orderIndex);
  }
  for (const v of lesson.vocabulary ?? []) {
    if (!v.example || !String(v.example).trim()) {
      issues.push(`Từ "${v.word}" thiếu câu ví dụ`);
    }
  }
  return issues;
}

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
    // Publish gate: chặn xuất bản nếu nội dung chưa đủ.
    if (dto.isPublished === true && !lesson.isPublished) {
      const full = await this.findOne(id);
      const issues = validateLessonForPublish(full);
      if (issues.length > 0) {
        throw new BadRequestException({
          message: 'Chưa thể xuất bản: nội dung còn thiếu',
          code: 'PUBLISH_VALIDATION_FAILED',
          issues,
        });
      }
    }
    Object.assign(lesson, dto);
    return this.lessonsRepo.save(lesson);
  }

  // Kiểm tra trước (để admin xem trước khi publish).
  async validatePublish(id: string): Promise<string[]> {
    return validateLessonForPublish(await this.findOne(id));
  }

  async remove(id: string): Promise<void> {
    const result = await this.lessonsRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Không tìm thấy bài học');
  }
}
