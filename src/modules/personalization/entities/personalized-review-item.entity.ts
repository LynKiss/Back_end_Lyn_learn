import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

// Mục ôn tập cá nhân hóa, tự sinh từ lỗi sai (hoặc từ vựng cần ôn).
@Entity('personalized_review_items')
export class PersonalizedReviewItem extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @Column({ type: 'varchar', length: 32 })
  skill: string;

  @Column({ name: 'source_type', type: 'varchar', length: 16 })
  sourceType: string; // 'mistake' | 'vocabulary'

  @Column({ name: 'mistake_type', type: 'varchar', length: 32, nullable: true })
  mistakeType: string | null;

  @Column({ name: 'exercise_id', type: 'bigint', unsigned: true, nullable: true })
  exerciseId: string | null;

  @Column({ name: 'lesson_id', type: 'bigint', unsigned: true, nullable: true })
  lessonId: string | null;

  @Column({ name: 'vocabulary_id', type: 'bigint', unsigned: true, nullable: true })
  vocabularyId: string | null;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ name: 'correct_answer', type: 'text', nullable: true })
  correctAnswer: string | null;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: string; // 'pending' | 'resolved'

  @Column({ name: 'due_at', type: 'datetime' })
  dueAt: Date;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;
}
