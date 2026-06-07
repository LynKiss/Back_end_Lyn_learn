import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { UserBadge } from './user-badge.entity';

@Entity('badges')
export class Badge extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 80 })
  code: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  icon: string | null;

  @Column({ name: 'xp_threshold', type: 'int', default: 0 })
  xpThreshold: number;

  @OneToMany(() => UserBadge, (userBadge) => userBadge.badge)
  userBadges: UserBadge[];
}
