import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ name: 'daily_goal_minutes', type: 'int', default: 15 })
  dailyGoalMinutes: number;

  @Column({ length: 50, default: 'Asia/Ho_Chi_Minh' })
  timezone: string;

  @Column({ name: 'total_xp', type: 'int', default: 0 })
  totalXp: number;

  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', type: 'int', default: 0 })
  longestStreak: number;

  @Column({ name: 'last_active_date', type: 'date', nullable: true })
  lastActiveDate: Date | null;

  // Tim (lượt làm sai) — hồi phục theo thời gian.
  @Column({ type: 'int', default: 5 })
  hearts: number;

  @Column({ name: 'hearts_updated_at', type: 'datetime', nullable: true })
  heartsUpdatedAt: Date | null;
}
