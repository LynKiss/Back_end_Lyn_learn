// Enum dùng chung toàn hệ thống

export enum UserRole {
  STUDENT = 'student',
  ADMIN = 'admin',
}

export enum CefrLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

export enum LessonType {
  VOCAB = 'vocab',
  GRAMMAR = 'grammar',
  LISTENING = 'listening',
  READING = 'reading',
  SPEAKING = 'speaking',
  WRITING = 'writing',
}

export enum ExerciseType {
  MCQ = 'mcq',
  FILL_BLANK = 'fill_blank',
  MATCHING = 'matching',
  DICTATION = 'dictation',
  READING_COMPREHENSION = 'reading_comprehension',
  TRANSLATION = 'translation',
  ERROR_CORRECTION = 'error_correction',
  SPEAKING = 'speaking',
  WRITING = 'writing',
  REORDER = 'reorder',
}

export enum LevelScale {
  CEFR = 'CEFR',
  HSK = 'HSK',
  JLPT = 'JLPT',
}

export enum ReviewRating {
  AGAIN = 'again',
  HARD = 'hard',
  GOOD = 'good',
  EASY = 'easy',
}

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
}

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum SubmissionStatus {
  PENDING = 'pending',
  TRANSCRIBING = 'transcribing',
  REVIEWED = 'reviewed',
  FAILED = 'failed',
}

export enum LearningPathStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum PathItemStatus {
  LOCKED = 'locked',
  AVAILABLE = 'available',
  COMPLETED = 'completed',
}

export enum AiFeature {
  WRITING = 'writing',
  SPEAKING = 'speaking',
  TRANSCRIBE = 'transcribe',
  PATH = 'path',
}
