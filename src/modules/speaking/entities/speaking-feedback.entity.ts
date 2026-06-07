import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { SpeakingSubmission } from './speaking-submission.entity';

@Entity('speaking_feedbacks')
export class SpeakingFeedback extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'submission_id', type: 'bigint', unsigned: true })
  submissionId: string;

  @OneToOne(() => SpeakingSubmission, (submission) => submission.feedback, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission: SpeakingSubmission;

  @Column({ name: 'pronunciation_score', type: 'decimal', precision: 4, scale: 2 })
  pronunciationScore: number;

  @Column({ name: 'fluency_score', type: 'decimal', precision: 4, scale: 2 })
  fluencyScore: number;

  @Column({ name: 'accuracy_score', type: 'decimal', precision: 4, scale: 2 })
  accuracyScore: number;

  @Column({ type: 'json', nullable: true })
  feedback: unknown;

  @Column({ name: 'ai_model', type: 'varchar', length: 50, nullable: true })
  aiModel: string | null;
}
