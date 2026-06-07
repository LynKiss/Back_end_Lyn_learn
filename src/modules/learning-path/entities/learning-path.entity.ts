import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { LearningPathStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { LearningPathItem } from './learning-path-item.entity';

@Entity('learning_paths')
export class LearningPath extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 200 })
  title: string;

  @Column({ name: 'language_code', length: 20, default: 'en' })
  languageCode: string;

  @Column({ name: 'level_scale', length: 20, default: 'CEFR' })
  levelScale: string;

  @Column({ name: 'target_level', length: 20 })
  targetLevel: string;

  @Column({
    type: 'enum',
    enum: LearningPathStatus,
    default: LearningPathStatus.ACTIVE,
  })
  status: LearningPathStatus;

  @OneToMany(() => LearningPathItem, (item) => item.path)
  items: LearningPathItem[];
}
