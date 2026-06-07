import { Entity, Column, OneToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { UserRole } from '../../../common/enums';
import { UserProfile } from './user-profile.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'display_name', length: 100 })
  displayName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @Column({ name: 'native_language', length: 20, default: 'vi' })
  nativeLanguage: string;

  @Column({ name: 'target_language', length: 20, default: 'en' })
  targetLanguage: string;

  @Column({
    name: 'current_level',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  currentLevel: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile: UserProfile;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
}
