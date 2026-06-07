import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  // Lấy user kèm password_hash (cột select:false) để xác thực đăng nhập.
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  // Danh sách người dùng kèm hồ sơ (cho admin).
  findAll(): Promise<User[]> {
    return this.usersRepo.find({
      relations: { profile: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Hồ sơ đầy đủ của chính mình.
  async getProfile(userId: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: { profile: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  // Cập nhật thông tin cá nhân + hồ sơ.
  async updateProfile(
    userId: string,
    data: {
      displayName?: string;
      avatarUrl?: string;
      nativeLanguage?: string;
      targetLanguage?: string;
      bio?: string;
      dailyGoalMinutes?: number;
    },
  ): Promise<User> {
    const user = await this.getProfile(userId);

    if (data.displayName !== undefined) user.displayName = data.displayName;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
    if (data.nativeLanguage !== undefined) user.nativeLanguage = data.nativeLanguage;
    if (data.targetLanguage !== undefined) user.targetLanguage = data.targetLanguage;
    await this.usersRepo.save(user);

    if (data.bio !== undefined || data.dailyGoalMinutes !== undefined) {
      if (data.bio !== undefined) user.profile.bio = data.bio;
      if (data.dailyGoalMinutes !== undefined)
        user.profile.dailyGoalMinutes = data.dailyGoalMinutes;
      await this.dataSource.getRepository(UserProfile).save(user.profile);
    }
    return this.getProfile(userId);
  }

  // Tạo user + profile trong cùng transaction.
  async createWithProfile(data: {
    email: string;
    passwordHash: string;
    displayName: string;
    nativeLanguage?: string;
    targetLanguage?: string;
  }): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        nativeLanguage: data.nativeLanguage ?? 'vi',
        targetLanguage: data.targetLanguage ?? 'en',
      });
      const saved = await manager.save(user);

      const profile = manager.create(UserProfile, { userId: saved.id });
      await manager.save(profile);

      return saved;
    });
  }
}
