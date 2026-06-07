import { Entity, Column, ManyToOne, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { SubmissionStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Exercise } from '../../courses/entities/exercise.entity';
import { WritingFeedback } from './writing-feedback.entity';

@Entity('writing_submissions')
export class WritingSubmission extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'exercise_id', type: 'bigint', unsigned: true, nullable: true })
  exerciseId: string | null;

  @ManyToOne(() => Exercise, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise | null;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'mediumtext' })
  content: string;

  @Column({ name: 'word_count', type: 'int', default: 0 })
  wordCount: number;

  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.PENDING })
  status: SubmissionStatus;

  @Column({ name: 'submitted_at', type: 'datetime' })
  submittedAt: Date;

  @OneToOne(() => WritingFeedback, (feedback) => feedback.submission)
  feedback: WritingFeedback;
}
