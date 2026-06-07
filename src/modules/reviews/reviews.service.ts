import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums';
import { CoursesService } from '../courses/courses.service';
import { CourseReview } from './entities/course-review.entity';
import { CreateCourseReviewDto, UpdateCourseReviewDto } from './dto/course-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(CourseReview)
    private readonly reviews: Repository<CourseReview>,
    private readonly courses: CoursesService,
  ) {}

  async list(courseId: string) {
    const [items, count] = await this.reviews.findAndCount({
      where: { courseId, isVisible: true },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
    const avg = count
      ? items.reduce((sum, item) => sum + item.rating, 0) / count
      : 0;
    return { items, count, averageRating: Number(avg.toFixed(2)) };
  }

  async upsert(userId: string, courseId: string, dto: CreateCourseReviewDto) {
    await this.courses.findById(courseId);
    const existing = await this.reviews.findOne({ where: { userId, courseId } });
    if (existing) {
      Object.assign(existing, dto, { comment: dto.comment ?? null, isVisible: true });
      return this.reviews.save(existing);
    }
    return this.reviews.save(
      this.reviews.create({
        userId,
        courseId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      }),
    );
  }

  async update(userId: string, role: UserRole, id: string, dto: UpdateCourseReviewDto) {
    const review = await this.findById(id);
    if (review.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Không có quyền sửa đánh giá này');
    }
    Object.assign(review, dto);
    if (dto.comment !== undefined) review.comment = dto.comment;
    return this.reviews.save(review);
  }

  async remove(userId: string, role: UserRole, id: string) {
    const review = await this.findById(id);
    if (review.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Không có quyền xóa đánh giá này');
    }
    await this.reviews.delete(id);
  }

  private async findById(id: string) {
    const review = await this.reviews.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return review;
  }
}
