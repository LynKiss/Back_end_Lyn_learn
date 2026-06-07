import { ExerciseType } from '../../common/enums';
import { Exercise } from '../courses/entities/exercise.entity';

export interface GradeResult {
  isCorrect: boolean;
  score: number; // điểm đạt được (0..exercise.points)
  autoGraded: boolean; // false nếu cần AI/người chấm (nói/viết)
}

// Chấm tự động cho các loại bài có đáp án cố định.
export function gradeExercise(
  exercise: Exercise,
  userAnswer: unknown,
): GradeResult {
  const answer = exercise.answer as Record<string, unknown> | null;
  const ua = (userAnswer ?? {}) as Record<string, unknown>;
  const full = exercise.points;

  switch (exercise.type) {
    case ExerciseType.MCQ: {
      // answer: { correctIndex }, userAnswer: { selectedIndex }
      const correct = answer?.correctIndex === ua.selectedIndex;
      return { isCorrect: correct, score: correct ? full : 0, autoGraded: true };
    }

    case ExerciseType.FILL_BLANK: {
      // answer: { accepted: string[] }, userAnswer: { text }
      const accepted = (answer?.accepted as string[] | undefined) ?? [];
      const text = String(ua.text ?? '').trim().toLowerCase();
      const correct = accepted.some((a) => a.trim().toLowerCase() === text);
      return { isCorrect: correct, score: correct ? full : 0, autoGraded: true };
    }

    case ExerciseType.REORDER: {
      // answer: { order: number[] }, userAnswer: { order: number[] }
      const expected = (answer?.order as number[] | undefined) ?? [];
      const got = (ua.order as number[] | undefined) ?? [];
      const correct =
        expected.length === got.length &&
        expected.every((v, i) => v === got[i]);
      return { isCorrect: correct, score: correct ? full : 0, autoGraded: true };
    }

    case ExerciseType.MATCHING: {
      // answer: { pairs: Record<string,string> }, userAnswer: { pairs }
      const expected = (answer?.pairs as Record<string, string>) ?? {};
      const got = (ua.pairs as Record<string, string>) ?? {};
      const keys = Object.keys(expected);
      const matched = keys.filter((k) => expected[k] === got[k]).length;
      const score = keys.length ? Math.round((matched / keys.length) * full) : 0;
      return {
        isCorrect: matched === keys.length && keys.length > 0,
        score,
        autoGraded: true,
      };
    }

    case ExerciseType.DICTATION: {
      const expected = String(answer?.text ?? '').trim().toLowerCase();
      const text = String(ua.text ?? '').trim().toLowerCase();
      const correct = expected.length > 0 && expected === text;
      return { isCorrect: correct, score: correct ? full : 0, autoGraded: true };
    }

    case ExerciseType.TRANSLATION:
    case ExerciseType.ERROR_CORRECTION: {
      const accepted = (answer?.accepted as string[] | undefined) ?? [];
      const text = String(ua.text ?? '').trim().toLowerCase();
      const correct = accepted.some((a) => a.trim().toLowerCase() === text);
      return { isCorrect: correct, score: correct ? full : 0, autoGraded: true };
    }

    case ExerciseType.READING_COMPREHENSION: {
      const expected = answer?.correctIndex;
      const selected = ua.selectedIndex;
      const correct = expected === selected;
      return { isCorrect: correct, score: correct ? full : 0, autoGraded: true };
    }

    // Nói / viết: cần AI hoặc người chấm (xử lý ở M3/M4).
    case ExerciseType.SPEAKING:
    case ExerciseType.WRITING:
    default:
      return { isCorrect: false, score: 0, autoGraded: false };
  }
}
