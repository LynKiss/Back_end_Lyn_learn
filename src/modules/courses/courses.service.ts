import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { uniqueSlug } from '../../common/utils/slug';
import { CefrLevel, LevelScale } from '../../common/enums';

export interface CourseFilters {
  publishedOnly?: boolean;
  search?: string;
  level?: CefrLevel;
  languageCode?: string;
  levelScale?: LevelScale;
  levelCode?: string;
  categoryId?: string;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepo: Repository<Course>,
  ) {}

  async create(dto: CreateCourseDto): Promise<Course> {
    const legacyLevel = dto.level ?? (dto.levelScale === LevelScale.CEFR ? (dto.levelCode as CefrLevel) : undefined);
    const course = this.coursesRepo.create({
      ...dto,
      language: dto.language ?? dto.languageCode ?? 'en',
      languageCode: dto.languageCode ?? dto.language ?? 'en',
      levelScale: dto.levelScale ?? LevelScale.CEFR,
      levelCode: dto.levelCode ?? dto.level ?? 'A1',
      level: legacyLevel ?? CefrLevel.A1,
      slug: uniqueSlug(dto.title),
    });
    return this.coursesRepo.save(course);
  }

  // Tìm kiếm/lọc khóa học. publishedOnly=true cho học viên; admin xem tất cả.
  findAll(filters: CourseFilters = {}): Promise<Course[]> {
    const qb = this.coursesRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .orderBy('course.orderIndex', 'ASC')
      .addOrderBy('course.createdAt', 'DESC');

    if (filters.publishedOnly !== false) {
      qb.andWhere('course.isPublished = :p', { p: true });
    }
    if (filters.search) {
      qb.andWhere(
        '(course.title LIKE :s OR course.description LIKE :s)',
        { s: `%${filters.search}%` },
      );
    }
    if (filters.level) {
      qb.andWhere('(course.levelCode = :lvl OR course.level = :lvl)', { lvl: filters.level });
    }
    if (filters.languageCode) {
      qb.andWhere('course.languageCode = :lang', { lang: filters.languageCode });
    }
    if (filters.levelScale) {
      qb.andWhere('course.levelScale = :scale', { scale: filters.levelScale });
    }
    if (filters.levelCode) {
      qb.andWhere('course.levelCode = :code', { code: filters.levelCode });
    }
    if (filters.categoryId) {
      qb.andWhere('course.categoryId = :cid', { cid: filters.categoryId });
    }
    return qb.getMany();
  }

  // Lấy cây nội dung: course -> units -> lessons.
  async findOne(id: string): Promise<Course> {
    const course = await this.coursesRepo.findOne({
      where: { id },
      relations: { category: true, units: { lessons: true } },
      order: { units: { orderIndex: 'ASC', lessons: { orderIndex: 'ASC' } } },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    return course;
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    const course = await this.findById(id);
    Object.assign(course, dto);
    if (dto.languageCode !== undefined) course.language = dto.languageCode;
    if (dto.language !== undefined) course.languageCode = dto.language;
    if (dto.levelCode !== undefined) course.levelCode = dto.levelCode;
    if (dto.levelScale !== undefined) course.levelScale = dto.levelScale;
    if (dto.level !== undefined) {
      course.level = dto.level;
      course.levelCode = dto.level;
      course.levelScale = LevelScale.CEFR;
    }
    return this.coursesRepo.save(course);
  }

  async remove(id: string): Promise<void> {
    const result = await this.coursesRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Không tìm thấy khóa học');
  }

  async findById(id: string): Promise<Course> {
    const course = await this.coursesRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    return course;
  }
}
