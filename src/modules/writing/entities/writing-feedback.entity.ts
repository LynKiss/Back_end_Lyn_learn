import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { WritingSubmission } from './writing-submission.entity';

@Entity('writing_feedbacks')
export class WritingFeedback extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'submission_id', type: 'bigint', unsigned: true })
  submissionId: string;

  @OneToOne(() => WritingSubmission, (submission) => submission.feedback, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission: WritingSubmission;

  @Column({ name: 'overall_score', type: 'decimal', precision: 4, scale: 2 })
  overallScore: number;

  @Column({ name: 'grammar_score', type: 'decimal', precision: 4, scale: 2 })
  grammarScore: number;

  @Column({ name: 'vocabulary_score', type: 'decimal', precision: 4, scale: 2 })
  vocabularyScore: number;

  @Column({ name: 'coherence_score', type: 'decimal', precision: 4, scale: 2 })
  coherenceScore: number;

  @Column({ name: 'corrected_text', type: 'mediumtext', nullable: true })
  correctedText: string | null;

  // mảng lỗi: [{ type, original, suggestion, explanation }]
  @Column({ type: 'json', nullable: true })
  feedback: unknown;

  @Column({ name: 'ai_model', type: 'varchar', length: 50, nullable: true })
  aiModel: string | null;
}
