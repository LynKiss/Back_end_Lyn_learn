import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { LessonProgress } from './entities/lesson-progress.entity';
import { ExerciseAttempt } from './entities/exercise-attempt.entity';
import { Unit } from '../courses/entities/unit.entity';
import { EnrollmentStatus, ProgressStatus } from '../../common/enums';
import { CoursesService } from '../courses/courses.service';
import { LessonsService } from '../courses/lessons.service';
import { ExercisesService } from '../courses/exercises.service';
import { gradeExercise } from './grader';
import { GamificationService } from '../gamification/gamification.service';
import { LearningPathService } from '../learning-path/learning-path.service';
import { PersonalizationService } from '../personalization/personalization.service';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepo: Repository<LessonProgress>,
    @InjectRepository(ExerciseAttempt)
    private readonly attemptRepo: Repository<ExerciseAttempt>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    private readonly coursesService: CoursesService,
    private readonly lessonsService: LessonsService,
    private readonly exercisesService: ExercisesService,
    private readonly gamification: GamificationService,
    private readonly learningPath: LearningPathService,
    private readonly personalization: PersonalizationService,
  ) {}

  // ---- Ghi danh ----

  async enroll(userId: string, courseId: string): Promise<Enrollment> {
    await this.coursesService.findById(courseId);
    const existing = await this.enrollmentRepo.findOne({
      where: { userId, courseId },
    });
    if (existing) return existing;

    const enrollment = this.enrollmentRepo.create({
      userId,
      courseId,
      enrolledAt: new Date(),
    });
    return this.enrollmentRepo.save(enrollment);
  }

  myEnrollments(userId: string): Promise<Enrollment[]> {
    return this.enrollmentRepo.find({
      where: { userId },
      relations: { course: true },
      order: { enrolledAt: 'DESC' },
    });
  }

  // ---- Tiến độ bài học ----

  async startLesson(userId: string, lessonId: string): Promise<LessonProgress> {
    await this.lessonsService.findById(lessonId);
    const progress = await this.getOrCreateProgress(userId, lessonId);
    if (progress.status === ProgressStatus.NOT_STARTED) {
      progress.status = ProgressStatus.IN_PROGRESS;
      await this.lessonProgressRepo.save(progress);
    }
    return progress;
  }

  async completeLesson(
    userId: string,
    lessonId: string,
    score?: number,
  ): Promise<LessonProgress> {
    const lesson = await this.lessonsService.findById(lessonId);
    const progress = await this.getOrCreateProgress(userId, lessonId);
    const wasCompleted = progress.status === ProgressStatus.COMPLETED;
    progress.status = ProgressStatus.COMPLETED;
    progress.completedAt = new Date();
    if (score !== undefined) progress.score = score;
    const saved = await this.lessonProgressRepo.save(progress);

    await this.recomputeCourseProgress(userId, lesson.unitId);
    // Đồng bộ mục lộ trình tương ứng (nếu bài thuộc lộ trình đang học).
    await this.learningPath.markLessonCompleted(userId, lessonId).catch(() => {});
    // Chỉ cộng XP cho lần hoàn thành ĐẦU TIÊN (tránh farm XP).
    if (!wasCompleted) {
      await this.gamification
        .awardXp(userId, 20, 'lesson_completed', lessonId)
        .catch(() => {});
    }
    return saved;
  }

  // Tổng quan tiến độ 1 khóa: số bài đã hoàn thành / tổng số bài.
  async getCourseProgress(userId: string, courseId: string) {
    const course = await this.coursesService.findOne(courseId);
    const lessonIds = course.units.flatMap((u) => u.lessons.map((l) => l.id));

    const progresses = lessonIds.length
      ? await this.lessonProgressRepo.find({
          where: { userId, lessonId: In(lessonIds) },
        })
      : [];

    const completed = progresses.filter(
      (p) => p.status === ProgressStatus.COMPLETED,
    ).length;
    const total = lessonIds.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    return {
      courseId,
      totalLessons: total,
      completedLessons: completed,
      percent,
      lessons: progresses.map((p) => ({
        lessonId: p.lessonId,
        status: p.status,
        score: p.score,
      })),
    };
  }

  // ---- Nộp bài tập (chấm tự động) ----

  async submitAttempt(userId: string, exerciseId: string, answer: unknown) {
    const exercise = await this.exercisesService.findById(exerciseId);
    const result = gradeExercise(exercise, answer);

    // Đã từng làm đúng bài này chưa? (để chỉ thưởng XP một lần)
    const priorCorrect = await this.attemptRepo.findOne({
      where: { userId, exerciseId, isCorrect: true },
    });

    const attempt = this.attemptRepo.create({
      userId,
      exerciseId,
      userAnswer: answer,
      isCorrect: result.isCorrect,
      score: result.score,
      attemptedAt: new Date(),
    });
    const saved = await this.attemptRepo.save(attempt);
    // Chỉ thưởng XP lần đầu làm đúng (tránh farm bằng cách nộp lại).
    if (result.autoGraded && result.isCorrect && !priorCorrect) {
      await this.gamification
        .awardXp(
          userId,
          Math.max(5, Math.round(result.score)),
          'exercise_attempt',
          exerciseId,
        )
        .catch(() => {});
    }
    // Cá nhân hóa: ghi nhận lỗi sai / củng cố kỹ năng (không chặn luồng nộp bài).
    if (result.autoGraded) {
      if (result.isCorrect) {
        await this.personalization
          .recordCorrectAttempt(userId, exercise)
          .catch(() => {});
      } else {
        await this.personalization
          .recordWrongAttempt(userId, exercise, answer)
          .catch(() => {});
      }
    }

    return {
      attemptId: saved.id,
      isCorrect: result.isCorrect,
      score: result.score,
      maxScore: result.maxScore,
      autoGraded: result.autoGraded,
      explanation: result.explanation ?? null,
      normalizedAnswer: result.normalizedAnswer ?? null,
    };
  }

  // ---- helpers ----

  private async getOrCreateProgress(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress> {
    let progress = await this.lessonProgressRepo.findOne({
      where: { userId, lessonId },
    });
    if (!progress) {
      progress = this.lessonProgressRepo.create({
        userId,
        lessonId,
        status: ProgressStatus.NOT_STARTED,
      });
    }
    return progress;
  }

  // Cập nhật progress_percent của enrollment dựa trên bài đã hoàn thành.
  private async recomputeCourseProgress(userId: string, unitId: string) {
    const unit = await this.unitRepo.findOne({ where: { id: unitId } });
    const courseId = unit?.courseId;
    if (!courseId) return;

    const enrollment = await this.enrollmentRepo.findOne({
      where: { userId, courseId },
    });
    if (!enrollment) return;

    const { percent } = await this.getCourseProgress(userId, courseId);
    enrollment.progressPercent = percent;
    if (percent >= 100) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.completedAt = new Date();
    }
    await this.enrollmentRepo.save(enrollment);
  }
}
