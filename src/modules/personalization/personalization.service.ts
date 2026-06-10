import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ExerciseType } from '../../common/enums';
import { Exercise } from '../courses/entities/exercise.entity';
import { MistakeEvent } from './entities/mistake-event.entity';
import { UserSkillMastery } from './entities/user-skill-mastery.entity';
import { PersonalizedReviewItem } from './entities/personalized-review-item.entity';

export const SKILLS = [
  'pronunciation',
  'vocabulary',
  'grammar',
  'listening',
  'speaking',
  'reading',
  'writing',
] as const;

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// Suy ra kỹ năng + loại lỗi từ loại bài tập.
function skillForExercise(type: ExerciseType): string {
  switch (type) {
    case ExerciseType.DICTATION:
      return 'listening';
    case ExerciseType.READING_COMPREHENSION:
      return 'reading';
    case ExerciseType.SPEAKING:
      return 'speaking';
    case ExerciseType.WRITING:
      return 'writing';
    case ExerciseType.FILL_BLANK:
    case ExerciseType.REORDER:
    case ExerciseType.ERROR_CORRECTION:
      return 'grammar';
    case ExerciseType.MCQ:
    case ExerciseType.MATCHING:
    case ExerciseType.TRANSLATION:
    default:
      return 'vocabulary';
  }
}

function mistakeTypeForExercise(type: ExerciseType): string {
  switch (type) {
    case ExerciseType.REORDER:
      return 'wrong_order';
    case ExerciseType.DICTATION:
      return 'listening_confusion';
    case ExerciseType.TRANSLATION:
      return 'translation_error';
    case ExerciseType.ERROR_CORRECTION:
    case ExerciseType.FILL_BLANK:
      return 'grammar';
    case ExerciseType.SPEAKING:
      return 'pronunciation';
    case ExerciseType.MATCHING:
    case ExerciseType.MCQ:
    default:
      return 'wrong_word';
  }
}

// Lấy đáp án đúng dạng chữ để hiển thị lại cho người học.
function describeCorrect(exercise: Exercise): string | null {
  const answer = (exercise.answer ?? {}) as Record<string, unknown>;
  const content = (exercise.content ?? {}) as Record<string, unknown>;
  const options = (content.options as string[] | undefined) ?? [];
  if (typeof answer.correctIndex === 'number' && options[answer.correctIndex]) {
    return String(options[answer.correctIndex]);
  }
  if (Array.isArray(answer.accepted) && answer.accepted.length) {
    return String((answer.accepted as unknown[])[0]);
  }
  if (typeof answer.text === 'string') return answer.text;
  if (Array.isArray(answer.order) && Array.isArray(content.words)) {
    return (answer.order as number[])
      .map((i) => (content.words as string[])[i])
      .filter(Boolean)
      .join(' ');
  }
  return null;
}

@Injectable()
export class PersonalizationService {
  constructor(
    @InjectRepository(MistakeEvent)
    private readonly mistakeRepo: Repository<MistakeEvent>,
    @InjectRepository(UserSkillMastery)
    private readonly masteryRepo: Repository<UserSkillMastery>,
    @InjectRepository(PersonalizedReviewItem)
    private readonly reviewRepo: Repository<PersonalizedReviewItem>,
  ) {}

  // ===== Ghi nhận khi chấm bài =====

  // Người học làm SAI một bài tập tự chấm → lưu lỗi, hạ mastery, tạo mục ôn.
  async recordWrongAttempt(
    userId: string,
    exercise: Exercise,
    userAnswer: unknown,
  ): Promise<void> {
    const skill = skillForExercise(exercise.type);
    const mistakeType = mistakeTypeForExercise(exercise.type);
    const correct = describeCorrect(exercise);
    const userText = this.stringifyAnswer(userAnswer);

    await this.mistakeRepo.save(
      this.mistakeRepo.create({
        userId,
        exerciseId: exercise.id,
        lessonId: exercise.lessonId,
        vocabularyId: null,
        skill,
        mistakeType,
        targetText: exercise.prompt ?? null,
        userAnswer: userText,
        correctAnswer: correct,
        severity: 1,
      }),
    );

    await this.bumpMastery(userId, skill, false);

    // Không tạo trùng mục ôn còn pending cho cùng exercise.
    const existing = await this.reviewRepo.findOne({
      where: { userId, exerciseId: exercise.id, status: 'pending' },
    });
    if (!existing) {
      await this.reviewRepo.save(
        this.reviewRepo.create({
          userId,
          skill,
          sourceType: 'mistake',
          mistakeType,
          exerciseId: exercise.id,
          lessonId: exercise.lessonId,
          vocabularyId: null,
          prompt: exercise.prompt ?? '',
          correctAnswer: correct,
          status: 'pending',
          dueAt: new Date(Date.now() + 24 * 3600 * 1000),
          resolvedAt: null,
        }),
      );
    }
  }

  // Người học làm ĐÚNG → nâng nhẹ mastery của kỹ năng.
  async recordCorrectAttempt(userId: string, exercise: Exercise): Promise<void> {
    await this.bumpMastery(userId, skillForExercise(exercise.type), true);
  }

  // Ghi lỗi từ một lượt nói (speaking conversation) → mastery + mục ôn cá nhân.
  async recordSpeakingTurn(
    userId: string,
    params: {
      corrections: { original?: string; suggestion?: string; explanation?: string }[];
      text: string;
    },
  ): Promise<void> {
    const corrections = (params.corrections ?? []).slice(0, 5);
    for (const c of corrections) {
      await this.mistakeRepo.save(
        this.mistakeRepo.create({
          userId,
          exerciseId: null,
          lessonId: null,
          vocabularyId: null,
          skill: 'speaking',
          mistakeType: 'pronunciation',
          targetText: params.text?.slice(0, 240) ?? null,
          userAnswer: c.original ?? null,
          correctAnswer: c.suggestion ?? null,
          severity: 1,
        }),
      );
      await this.reviewRepo.save(
        this.reviewRepo.create({
          userId,
          skill: 'speaking',
          sourceType: 'mistake',
          mistakeType: 'pronunciation',
          exerciseId: null,
          lessonId: null,
          vocabularyId: null,
          prompt: c.explanation ?? c.original ?? params.text ?? '',
          correctAnswer: c.suggestion ?? null,
          status: 'pending',
          dueAt: new Date(Date.now() + 24 * 3600 * 1000),
          resolvedAt: null,
        }),
      );
    }
    await this.bumpMastery(userId, 'speaking', corrections.length === 0);
  }

  // Ghi lỗi từ phản hồi bài viết (AI) → mastery 'writing' + mục ôn cá nhân.
  async recordWritingMistakes(
    userId: string,
    review: unknown,
    text: string,
  ): Promise<void> {
    const obj = review && typeof review === 'object' ? (review as Record<string, unknown>) : {};
    const errs = (Array.isArray(obj.feedback)
      ? obj.feedback
      : Array.isArray(obj.errors)
        ? obj.errors
        : []) as unknown[];
    const items = errs.slice(0, 6);
    for (const e of items) {
      const it = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
      const original = String(it.original ?? it.wrong ?? (typeof e === 'string' ? e : ''));
      const suggestion = (it.suggestion ?? it.correct) as string | undefined;
      const explanation = (it.explanation ?? it.note) as string | undefined;
      await this.mistakeRepo.save(
        this.mistakeRepo.create({
          userId,
          exerciseId: null,
          lessonId: null,
          vocabularyId: null,
          skill: 'writing',
          mistakeType: 'grammar',
          targetText: text?.slice(0, 240) ?? null,
          userAnswer: original || null,
          correctAnswer: suggestion ?? null,
          severity: 1,
        }),
      );
      await this.reviewRepo.save(
        this.reviewRepo.create({
          userId,
          skill: 'writing',
          sourceType: 'mistake',
          mistakeType: 'grammar',
          exerciseId: null,
          lessonId: null,
          vocabularyId: null,
          prompt: explanation ?? original ?? '',
          correctAnswer: suggestion ?? null,
          status: 'pending',
          dueAt: new Date(Date.now() + 24 * 3600 * 1000),
          resolvedAt: null,
        }),
      );
    }
    await this.bumpMastery(userId, 'writing', items.length === 0);
  }

  private async bumpMastery(userId: string, skill: string, correct: boolean) {
    let row = await this.masteryRepo.findOne({ where: { userId, skill } });
    if (!row) {
      row = this.masteryRepo.create({
        userId,
        skill,
        masteryScore: 50,
        attempts: 0,
        mistakes: 0,
      });
    }
    row.attempts += 1;
    if (correct) {
      row.masteryScore = clamp(row.masteryScore + 3);
    } else {
      row.mistakes += 1;
      row.masteryScore = clamp(row.masteryScore - 7);
    }
    row.lastPracticedAt = new Date();
    // Mastery càng thấp → đề xuất ôn càng sớm.
    const hours = correct ? 48 : Math.max(6, Math.round(row.masteryScore / 3));
    row.recommendedReviewAt = new Date(Date.now() + hours * 3600 * 1000);
    await this.masteryRepo.save(row);
  }

  private stringifyAnswer(answer: unknown): string | null {
    if (answer == null) return null;
    if (typeof answer === 'string') return answer;
    const a = answer as Record<string, unknown>;
    if (typeof a.text === 'string') return a.text;
    if (a.selectedIndex != null) return `#${String(a.selectedIndex)}`;
    try {
      return JSON.stringify(answer).slice(0, 240);
    } catch {
      return null;
    }
  }

  // ===== Truy vấn cho FE =====

  // Radar kỹ năng: luôn trả đủ 7 kỹ năng (điền mặc định nếu chưa có dữ liệu).
  async getMastery(userId: string) {
    const rows = await this.masteryRepo.find({ where: { userId } });
    const bySkill = new Map(rows.map((r) => [r.skill, r]));
    return SKILLS.map((skill) => {
      const r = bySkill.get(skill);
      // Mastery decay: không luyện thì giảm dần ~1 điểm/ngày (sàn 20) để
      // phản ánh việc quên theo thời gian và thúc đẩy ôn lại.
      let score = r?.masteryScore ?? 50;
      if (r?.lastPracticedAt) {
        const days = Math.floor(
          (Date.now() - new Date(r.lastPracticedAt).getTime()) / 86400000,
        );
        if (days > 0) score = Math.max(20, score - days);
      }
      return {
        skill,
        masteryScore: score,
        attempts: r?.attempts ?? 0,
        mistakes: r?.mistakes ?? 0,
        lastPracticedAt: r?.lastPracticedAt ?? null,
        recommendedReviewAt: r?.recommendedReviewAt ?? null,
        hasData: !!r,
      };
    });
  }

  getRecentMistakes(userId: string, limit = 20) {
    return this.mistakeRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 50),
    });
  }

  // Các mục ôn cá nhân còn chờ (đến hạn lên đầu).
  async getReviewItems(userId: string) {
    const items = await this.reviewRepo.find({
      where: { userId, status: 'pending' },
      order: { dueAt: 'ASC' },
      take: 50,
    });
    const now = new Date();
    return items.map((it) => ({ ...it, due: it.dueAt <= now }));
  }

  async getDueCount(userId: string) {
    return this.reviewRepo.count({
      where: { userId, status: 'pending', dueAt: LessThanOrEqual(new Date()) },
    });
  }

  async resolveReviewItem(userId: string, id: string) {
    const item = await this.reviewRepo.findOne({ where: { id, userId } });
    if (!item || item.status === 'resolved') return { ok: true };
    item.status = 'resolved';
    item.resolvedAt = new Date();
    await this.reviewRepo.save(item);
    return { ok: true };
  }
}
