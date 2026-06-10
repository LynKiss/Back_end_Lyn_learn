import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('xp_events')
@Index(['userId', 'createdAt'])
export class XpEvent extends BaseEntity {
  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  amount: number;

  @Column({ length: 80 })
  reason: string;

  // Đối tượng được thưởng (lessonId, exerciseId, savedVocabularyId...) để chống farm.
  @Column({ name: 'target_id', type: 'bigint', unsigned: true, nullable: true })
  targetId: string | null;
}
