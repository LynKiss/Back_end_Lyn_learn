import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { XpEvent } from './entities/xp-event.entity';

const MAX_HEARTS = 5;
const REGEN_MINUTES = 30; // hồi 1 tim mỗi 30 phút

@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profiles: Repository<UserProfile>,
    @InjectRepository(Badge)
    private readonly badges: Repository<Badge>,
    @InjectRepository(UserBadge)
    private readonly userBadges: Repository<UserBadge>,
    @InjectRepository(XpEvent)
    private readonly xpEvents: Repository<XpEvent>,
  ) {}

  // ---- Tim (hearts) + hồi phục theo thời gian ----

  private applyRegen(profile: UserProfile): boolean {
    if (profile.hearts >= MAX_HEARTS) return false;
    if (!profile.heartsUpdatedAt) {
      profile.heartsUpdatedAt = new Date();
      return true;
    }
    const elapsedMin = (Date.now() - new Date(profile.heartsUpdatedAt).getTime()) / 60000;
    const regen = Math.floor(elapsedMin / REGEN_MINUTES);
    if (regen <= 0) return false;
    profile.hearts = Math.min(MAX_HEARTS, profile.hearts + regen);
    profile.heartsUpdatedAt =
      profile.hearts >= MAX_HEARTS
        ? null
        : new Date(new Date(profile.heartsUpdatedAt).getTime() + regen * REGEN_MINUTES * 60000);
    return true;
  }

  private heartsState(profile: UserProfile) {
    let nextRegenSeconds = 0;
    if (profile.hearts < MAX_HEARTS && profile.heartsUpdatedAt) {
      const elapsedMs = Date.now() - new Date(profile.heartsUpdatedAt).getTime();
      nextRegenSeconds = Math.max(0, Math.ceil((REGEN_MINUTES * 60000 - (elapsedMs % (REGEN_MINUTES * 60000))) / 1000));
    }
    return { hearts: profile.hearts, max: MAX_HEARTS, nextRegenSeconds };
  }

  async getHearts(userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ học viên');
    if (this.applyRegen(profile)) await this.profiles.save(profile);
    return this.heartsState(profile);
  }

  async loseHeart(userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ học viên');
    this.applyRegen(profile);
    if (profile.hearts > 0) {
      // Bắt đầu đếm hồi phục khi rời mốc đầy.
      if (profile.hearts === MAX_HEARTS) profile.heartsUpdatedAt = new Date();
      profile.hearts -= 1;
      await this.profiles.save(profile);
    }
    return this.heartsState(profile);
  }

  // ---- Nhiệm vụ hằng ngày (suy ra từ xp_events trong ngày) ----

  async dailyQuests(userId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const events = await this.xpEvents.find({
      where: { userId, createdAt: MoreThanOrEqual(start) },
    });
    const xpToday = events.reduce((sum, e) => sum + e.amount, 0);
    const lessonsToday = events.filter((e) => e.reason === 'lesson_completed').length;
    const reviewsToday = events.filter((e) => e.reason === 'srs_review').length;

    const quests = [
      { key: 'earnXp', target: 30, current: xpToday },
      { key: 'completeLesson', target: 1, current: lessonsToday },
      { key: 'reviewCards', target: 5, current: reviewsToday },
    ].map((q) => ({ ...q, done: q.current >= q.target }));

    return { quests, completed: quests.filter((q) => q.done).length, total: quests.length };
  }

  async awardXp(userId: string, amount: number, reason: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ học viên');

    profile.totalXp += amount;
    this.updateStreak(profile);
    await this.profiles.save(profile);
    await this.xpEvents.save(this.xpEvents.create({ userId, amount, reason }));
    await this.syncBadges(userId, profile.totalXp);
    return profile;
  }

  async getMe(userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    const badges = await this.userBadges.find({
      where: { userId },
      relations: { badge: true },
      order: { earnedAt: 'DESC' },
    });
    return { profile, badges: badges.map((b) => b.badge) };
  }

  badgesList() {
    return this.badges.find({ order: { xpThreshold: 'ASC' } });
  }

  // Bảng xếp hạng công khai — chỉ trả thông tin an toàn (không email/role).
  async leaderboard() {
    const profiles = await this.profiles.find({
      relations: { user: true },
      order: { totalXp: 'DESC' },
      take: 50,
    });
    return profiles.map((p, i) => ({
      rank: i + 1,
      displayName: p.user?.displayName ?? 'Học viên',
      avatarUrl: p.user?.avatarUrl ?? null,
      currentLevel: p.user?.currentLevel ?? null,
      totalXp: p.totalXp,
      currentStreak: p.currentStreak,
    }));
  }

  private updateStreak(profile: UserProfile) {
    const today = new Date().toISOString().slice(0, 10);
    const last = profile.lastActiveDate
      ? new Date(profile.lastActiveDate).toISOString().slice(0, 10)
      : null;
    if (last === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.toISOString().slice(0, 10);
    profile.currentStreak = last === y ? profile.currentStreak + 1 : 1;
    profile.longestStreak = Math.max(profile.longestStreak, profile.currentStreak);
    profile.lastActiveDate = new Date(today);
  }

  private async syncBadges(userId: string, totalXp: number) {
    const badges = await this.badges
      .createQueryBuilder('badge')
      .where('badge.xpThreshold <= :totalXp', { totalXp })
      .getMany();
    for (const badge of badges) {
      const exists = await this.userBadges.findOne({
        where: { userId, badgeId: badge.id },
      });
      if (!exists) {
        await this.userBadges.save(
          this.userBadges.create({ userId, badgeId: badge.id, earnedAt: new Date() }),
        );
      }
    }
  }
}
