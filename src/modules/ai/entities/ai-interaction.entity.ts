import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { AiFeature } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('ai_interactions')
@Index(['userId', 'createdAt'])
export class AiInteraction extends BaseEntity {
  @Column({ name: 'user_id', type: 'bigint', unsigned: true, nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'enum', enum: AiFeature })
  feature: AiFeature;

  @Column({ length: 30 })
  provider: string;

  @Column({ length: 50 })
  model: string;

  @Column({ name: 'input_tokens', type: 'int', default: 0 })
  inputTokens: number;

  @Column({ name: 'output_tokens', type: 'int', default: 0 })
  outputTokens: number;

  @Column({ name: 'cost_usd', type: 'decimal', precision: 10, scale: 6, default: 0 })
  costUsd: number;
}
