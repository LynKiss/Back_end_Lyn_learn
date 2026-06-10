import { Entity, Column, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { ConversationTurn } from './conversation-turn.entity';

// Điểm + lỗi sửa cho một lượt nói của người học.
@Entity('speaking_turn_feedback')
export class SpeakingTurnFeedback extends BaseEntity {
  @Index()
  @Column({ name: 'turn_id', type: 'bigint', unsigned: true })
  turnId: string;

  @OneToOne(() => ConversationTurn, (t) => t.feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'turn_id' })
  turn: ConversationTurn;

  @Column({ name: 'pronunciation_score', type: 'int', default: 0 })
  pronunciationScore: number;

  @Column({ name: 'fluency_score', type: 'int', default: 0 })
  fluencyScore: number;

  @Column({ name: 'grammar_score', type: 'int', default: 0 })
  grammarScore: number;

  @Column({ name: 'vocabulary_score', type: 'int', default: 0 })
  vocabularyScore: number;

  @Column({ name: 'naturalness_score', type: 'int', default: 0 })
  naturalnessScore: number;

  @Column({ name: 'task_completion_score', type: 'int', default: 0 })
  taskCompletionScore: number;

  @Column({ type: 'json', nullable: true })
  corrections: unknown;
}
