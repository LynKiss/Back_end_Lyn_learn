import { ExerciseType } from '../../common/enums';
import { Exercise } from '../courses/entities/exercise.entity';

export interface GradeResult {
  isCorrect: boolean;
  score: number; // điểm đạt được (0..maxScore), hỗ trợ điểm thành phần
  maxScore: number;
  autoGraded: boolean; // false nếu cần AI/người chấm (nói/viết)
  explanation?: string | null;
  normalizedAnswer?: string | null;
}

// ---- Chuẩn hóa & so khớp mờ ----

// Bỏ dấu câu (kể cả CJK), gộp khoảng trắng, hạ chữ thường. KHÔNG bỏ dấu tiếng Việt
// (đổi nghĩa). Sai chính tả nhỏ được xử lý bằng độ tương đồng Levenshtein.
function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"'’“”。，！？；：、（）()]/g, '')
    .replace(/\s+/g, ' ');
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return 1 - dp[n] / Math.max(m, n);
}

function explanationOf(content: Record<string, unknown> | null): string | null {
  if (!content) return null;
  if (typeof content.explanation === 'string') return content.explanation;
  return null;
}

// Chấm bài text (fill/translation/dictation/error_correction) với fuzzy + điểm thành phần.
function gradeText(exercise: Exercise, ua: Record<string, unknown>): GradeResult {
  const answer = (exercise.answer ?? {}) as Record<string, unknown>;
  const content = (exercise.content ?? {}) as Record<string, unknown>;
  const full = exercise.points;
  const accepted =
    (answer.accepted as string[] | undefined) ??
    (answer.text != null ? [String(answer.text)] : []);
  const userText = String(ua.text ?? '');
  const nUser = normText(userText);
  const norms = accepted.map(normText);

  const exact = norms.includes(nUser);
  let best = 0;
  for (const a of norms) best = Math.max(best, similarity(nUser, a));

  // Sai chính tả nhỏ (>=0.9) vẫn tính đúng; 0.6–0.9 cho điểm thành phần.
  const correct = exact || best >= 0.9;
  const score = correct
    ? full
    : best >= 0.6
      ? Math.round(full * best)
      : 0;

  return {
    isCorrect: correct,
    score,
    maxScore: full,
    autoGraded: true,
    explanation: explanationOf(content) ?? (accepted[0] ? `→ ${accepted[0]}` : null),
    normalizedAnswer: accepted[0] ?? null,
  };
}

// ---- Chấm tự động ----
export function gradeExercise(exercise: Exercise, userAnswer: unknown): GradeResult {
  const answer = (exercise.answer ?? {}) as Record<string, unknown>;
  const content = (exercise.content ?? {}) as Record<string, unknown>;
  const ua = (userAnswer ?? {}) as Record<string, unknown>;
  const full = exercise.points;

  switch (exercise.type) {
    case ExerciseType.MCQ:
    case ExerciseType.READING_COMPREHENSION: {
      const correct = answer.correctIndex === ua.selectedIndex;
      const options = (content.options as string[] | undefined) ?? [];
      const idx = answer.correctIndex as number | undefined;
      return {
        isCorrect: correct,
        score: correct ? full : 0,
        maxScore: full,
        autoGraded: true,
        explanation:
          explanationOf(content) ??
          (idx != null && options[idx] ? `→ ${options[idx]}` : null),
        normalizedAnswer: idx != null ? (options[idx] ?? null) : null,
      };
    }

    case ExerciseType.FILL_BLANK:
    case ExerciseType.DICTATION:
    case ExerciseType.TRANSLATION:
    case ExerciseType.ERROR_CORRECTION:
      return gradeText(exercise, ua);

    case ExerciseType.REORDER: {
      // Chấm thành phần theo số vị trí đúng; chỉ "isCorrect" khi khớp hoàn toàn.
      const expected = (answer.order as number[] | undefined) ?? [];
      const got = (ua.order as number[] | undefined) ?? [];
      let matches = 0;
      for (let i = 0; i < expected.length; i++) {
        if (got[i] === expected[i]) matches++;
      }
      const correct = expected.length === got.length && matches === expected.length;
      const words = (content.words as string[] | undefined) ?? [];
      return {
        isCorrect: correct,
        score: expected.length ? Math.round((full * matches) / expected.length) : 0,
        maxScore: full,
        autoGraded: true,
        explanation: explanationOf(content),
        normalizedAnswer: expected.map((i) => words[i]).filter(Boolean).join(' ') || null,
      };
    }

    case ExerciseType.MATCHING: {
      const expected = (answer.pairs as Record<string, string>) ?? {};
      const got = (ua.pairs as Record<string, string>) ?? {};
      const keys = Object.keys(expected);
      const matched = keys.filter((k) => expected[k] === got[k]).length;
      return {
        isCorrect: matched === keys.length && keys.length > 0,
        score: keys.length ? Math.round((matched / keys.length) * full) : 0,
        maxScore: full,
        autoGraded: true,
        explanation: explanationOf(content),
        normalizedAnswer: null,
      };
    }

    // Nói / viết: chuyển AI module, không chấm bằng grader thường.
    case ExerciseType.SPEAKING:
    case ExerciseType.WRITING:
    default:
      return {
        isCorrect: false,
        score: 0,
        maxScore: full,
        autoGraded: false,
        explanation: null,
        normalizedAnswer: null,
      };
  }
}
