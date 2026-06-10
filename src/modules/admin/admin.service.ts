import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { Exercise } from '../courses/entities/exercise.entity';
import { Vocabulary } from '../courses/entities/vocabulary.entity';
import { Enrollment } from '../progress/entities/enrollment.entity';
import { WritingSubmission } from '../writing/entities/writing-submission.entity';
import { SpeakingSubmission } from '../speaking/entities/speaking-submission.entity';
import { SubmissionStatus } from '../../common/enums';

const AI_TYPES = ['speaking', 'writing'];

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Exercise) private readonly exercises: Repository<Exercise>,
    @InjectRepository(Vocabulary) private readonly vocab: Repository<Vocabulary>,
    @InjectRepository(Enrollment)
    private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(WritingSubmission)
    private readonly writing: Repository<WritingSubmission>,
    @InjectRepository(SpeakingSubmission)
    private readonly speaking: Repository<SpeakingSubmission>,
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

  // Sức khỏe nội dung: liệt kê các thiếu sót cần xử lý trước khi vận hành thật.
  async getContentHealth() {
    const lessons = await this.lessons.find();
    const exercises = await this.exercises.find();
    const vocab = await this.vocab.find();

    const lessonsMissingObjective = lessons.filter((l) => {
      const c = (l.content ?? {}) as { objectives?: unknown };
      return !Array.isArray(c.objectives) || c.objectives.length === 0;
    }).length;

    const lessonsMissingAudio = lessons.filter((l) => {
      const c = (l.content ?? {}) as { audio?: unknown };
      return l.lessonType === 'listening' && !c.audio;
    }).length;

    const exercisesMissingAnswer = exercises.filter(
      (e) => !AI_TYPES.includes(e.type) && e.answer == null,
    ).length;

    const exercisesMissingExplanation = exercises.filter((e) => {
      const c = (e.content ?? {}) as { explanation?: unknown };
      return !AI_TYPES.includes(e.type) && !c.explanation;
    }).length;

    const vocabMissingExample = vocab.filter(
      (v) => !v.example || !String(v.example).trim(),
    ).length;

    // orderIndex trùng trong cùng một bài học (bài tập).
    const byLesson = new Map<string, Set<number>>();
    let duplicateOrderIndex = 0;
    for (const e of exercises) {
      const set = byLesson.get(e.lessonId) ?? new Set<number>();
      if (set.has(e.orderIndex)) duplicateOrderIndex++;
      set.add(e.orderIndex);
      byLesson.set(e.lessonId, set);
    }

    const [draftLessons, draftCourses, aiFailedWriting, aiFailedSpeaking] =
      await Promise.all([
        this.lessons.count({ where: { isPublished: false } }),
        this.courses.count({ where: { isPublished: false } }),
        this.writing.count({ where: { status: SubmissionStatus.FAILED } }),
        this.speaking.count({ where: { status: SubmissionStatus.FAILED } }),
      ]);

    const checks = [
      { key: 'lessonsMissingObjective', count: lessonsMissingObjective, severity: 'high' },
      { key: 'exercisesMissingAnswer', count: exercisesMissingAnswer, severity: 'high' },
      { key: 'exercisesMissingExplanation', count: exercisesMissingExplanation, severity: 'medium' },
      { key: 'vocabMissingExample', count: vocabMissingExample, severity: 'medium' },
      { key: 'lessonsMissingAudio', count: lessonsMissingAudio, severity: 'medium' },
      { key: 'duplicateOrderIndex', count: duplicateOrderIndex, severity: 'low' },
      { key: 'draftLessons', count: draftLessons, severity: 'low' },
      { key: 'draftCourses', count: draftCourses, severity: 'low' },
      { key: 'aiFailedSubmissions', count: aiFailedWriting + aiFailedSpeaking, severity: 'high' },
    ];

    return {
      checks,
      totalIssues: checks.reduce((s, c) => s + (c.severity !== 'low' ? c.count : 0), 0),
      activeLearners: await this.users.count(),
    };
  }
}
