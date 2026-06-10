import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

// Một lần người học làm sai (nguồn dữ liệu cá nhân hóa).
@Entity('mistake_events')
export class MistakeEvent extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @Column({ name: 'exercise_id', type: 'bigint', unsigned: true, nullable: true })
  exerciseId: string | null;

  @Column({ name: 'lesson_id', type: 'bigint', unsigned: true, nullable: true })
  lessonId: string | null;

  @Column({ name: 'vocabulary_id', type: 'bigint', unsigned: true, nullable: true })
  vocabularyId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  skill: string;

  @Column({ name: 'mistake_type', type: 'varchar', length: 32 })
  mistakeType: string;

  @Column({ name: 'target_text', type: 'text', nullable: true })
  targetText: string | null;

  @Column({ name: 'user_answer', type: 'text', nullable: true })
  userAnswer: string | null;

  @Column({ name: 'correct_answer', type: 'text', nullable: true })
  correctAnswer: string | null;

  @Column({ type: 'int', default: 1 })
  severity: number;
}
