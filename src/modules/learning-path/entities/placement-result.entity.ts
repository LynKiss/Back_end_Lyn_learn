import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('placement_results')
export class PlacementResult extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: number;

  @Column({ name: 'language_code', length: 20, default: 'en' })
  languageCode: string;

  @Column({ name: 'level_scale', length: 20, default: 'CEFR' })
  levelScale: string;

  @Column({ name: 'determined_level', length: 20 })
  determinedLevel: string;

  @Column({ type: 'json', nullable: true })
  details: unknown;

  @Column({ name: 'taken_at', type: 'datetime' })
  takenAt: Date;
}
