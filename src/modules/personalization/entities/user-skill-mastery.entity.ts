import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

// Mức thành thạo từng kỹ năng, suy ra từ lịch sử đúng/sai.
@Entity('user_skill_mastery')
@Unique(['userId', 'skill'])
export class UserSkillMastery extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @Column({ type: 'varchar', length: 32 })
  skill: string;

  @Column({ name: 'mastery_score', type: 'int', default: 50 })
  masteryScore: number;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'int', default: 0 })
  mistakes: number;

  @Column({ name: 'last_practiced_at', type: 'datetime', nullable: true })
  lastPracticedAt: Date | null;

  @Column({ name: 'recommended_review_at', type: 'datetime', nullable: true })
  recommendedReviewAt: Date | null;

  @Column({ name: 'weak_patterns', type: 'json', nullable: true })
  weakPatterns: unknown;
}
