import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { Enrollment } from '../progress/entities/enrollment.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Enrollment)
    private readonly enrollments: Repository<Enrollment>,
  ) {}

  async getStats() {
    const [
      totalUsers,
      totalCourses,
      publishedCourses,
      totalLessons,
      totalEnrollments,
    ] = await Promise.all([
      this.users.count(),
      this.courses.count(),
      this.courses.count({ where: { isPublished: true } }),
      this.lessons.count(),
      this.enrollments.count(),
    ]);

    return {
      totalUsers,
      totalCourses,
      publishedCourses,
      draftCourses: totalCourses - publishedCourses,
      totalLessons,
      totalEnrollments,
    };
  }
}
