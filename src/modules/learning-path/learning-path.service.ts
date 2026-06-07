import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningPathStatus, PathItemStatus } from '../../common/enums';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { GamificationService } from '../gamification/gamification.service';
import { LearningPath } from './entities/learning-path.entity';
import { LearningPathItem } from './entities/learning-path-item.entity';
import { PlacementResult } from './entities/placement-result.entity';
import { CreatePlacementAttemptDto } from './dto/learning-path.dto';

// Thứ tự cấp độ theo từng thang đo, dùng để xếp khóa học từ dễ -> mục tiêu.
const SCALE_LEVELS: Record<string, string[]> = {
  CEFR: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
  HSK: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'],
  JLPT: ['N5', 'N4', 'N3', 'N2', 'N1'],
};

@Injectable()
export class LearningPathService {
  constructor(
    @InjectRepository(PlacementResult)
    private readonly placements: Repository<PlacementResult>,
    @InjectRepository(LearningPath)
    private readonly paths: Repository<LearningPath>,
    @InjectRepository(LearningPathItem)
    private readonly items: Repository<LearningPathItem>,
    @InjectRepository(Course)
    private readonly courses: Repository<Course>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly gamification: GamificationService,
  ) {}

  async submitPlacement(userId: string, dto: CreatePlacementAttemptDto) {
    const languageCode = dto.languageCode ?? 'en';
    const levelScale = dto.levelScale ?? this.defaultScale(languageCode);
    const level = this.determineLevel(levelScale, dto.score);

    const placement = await this.placements.save(
      this.placements.create({
        userId,
        languageCode,
        levelScale,
        score: dto.score,
        determinedLevel: level,
        details: dto.details ?? null,
        takenAt: new Date(),
      }),
    );

    await this.users.update(userId, { currentLevel: level, targetLanguage: languageCode });
    const path = await this.generatePath(userId, languageCode, levelScale, level);
    return { placement, path };
  }

  async getPath(userId: string) {
    const path = await this.paths.findOne({
      where: { userId, status: LearningPathStatus.ACTIVE },
      relations: { items: { lesson: true } },
      order: { items: { orderIndex: 'ASC' } },
    });
    return path ?? null;
  }

  async completeItem(userId: string, itemId: string) {
    const item = await this.items.findOne({ where: { id: itemId }, relations: { path: true } });
    if (!item || item.path.userId !== userId) throw new NotFoundException('Không tìm thấy mục lộ trình');

    const alreadyDone = item.status === PathItemStatus.COMPLETED;
    item.status = PathItemStatus.COMPLETED;
    await this.items.save(item);

    // Mở khóa mục tiếp theo theo thứ tự.
    const next = await this.items.findOne({
      where: { pathId: item.pathId, status: PathItemStatus.LOCKED },
      order: { orderIndex: 'ASC' },
    });
    if (next) {
      next.status = PathItemStatus.AVAILABLE;
      await this.items.save(next);
    }

    // Cộng XP một lần cho mỗi mục hoàn thành; đánh dấu lộ trình hoàn tất khi mọi mục đã xong.
    if (!alreadyDone) {
      await this.gamification.awardXp(userId, 15, 'path_item_complete').catch(() => {});
      const total = await this.items.count({ where: { pathId: item.pathId } });
      const completed = await this.items.count({
        where: { pathId: item.pathId, status: PathItemStatus.COMPLETED },
      });
      if (total > 0 && completed === total) {
        await this.paths.update(item.pathId, { status: LearningPathStatus.COMPLETED });
      }
    }
    return this.getPath(userId);
  }

  // Đồng bộ khi học viên hoàn thành 1 bài học: đánh dấu mục lộ trình tương ứng
  // là completed và mở khóa mục kế. KHÔNG cộng XP (completeLesson đã cộng).
  async markLessonCompleted(userId: string, lessonId: string) {
    const path = await this.paths.findOne({
      where: { userId, status: LearningPathStatus.ACTIVE },
    });
    if (!path) return;

    const item = await this.items.findOne({ where: { pathId: path.id, lessonId } });
    if (!item || item.status === PathItemStatus.COMPLETED) return;

    item.status = PathItemStatus.COMPLETED;
    await this.items.save(item);

    const next = await this.items.findOne({
      where: { pathId: path.id, status: PathItemStatus.LOCKED },
      order: { orderIndex: 'ASC' },
    });
    if (next) {
      next.status = PathItemStatus.AVAILABLE;
      await this.items.save(next);
    }

    const total = await this.items.count({ where: { pathId: path.id } });
    const completed = await this.items.count({
      where: { pathId: path.id, status: PathItemStatus.COMPLETED },
    });
    if (total > 0 && completed === total) {
      await this.paths.update(path.id, { status: LearningPathStatus.COMPLETED });
    }
  }

  private async generatePath(
    userId: string,
    languageCode: string,
    levelScale: string,
    targetLevel: string,
  ) {
    await this.paths.update(
      { userId, status: LearningPathStatus.ACTIVE },
      { status: LearningPathStatus.ARCHIVED },
    );
    const path = await this.paths.save(
      this.paths.create({
        userId,
        title: `Lộ trình ${languageCode.toUpperCase()} ${targetLevel}`,
        languageCode,
        levelScale,
        targetLevel,
        status: LearningPathStatus.ACTIVE,
      }),
    );

    // Lấy mọi khóa đã xuất bản đúng ngôn ngữ + thang đo, rồi lọc/sắp theo cấp độ.
    const all = await this.courses.find({
      where: { languageCode, levelScale: levelScale as never, isPublished: true },
      relations: { units: { lessons: true } },
      order: { orderIndex: 'ASC', units: { orderIndex: 'ASC', lessons: { orderIndex: 'ASC' } } },
    });

    const order = SCALE_LEVELS[levelScale] ?? SCALE_LEVELS.CEFR;
    const targetIdx = Math.max(0, order.indexOf(targetLevel));
    const idxOf = (code: string) => {
      const i = order.indexOf(code);
      return i === -1 ? 0 : i;
    };

    // Học từ dễ đến mục tiêu: chỉ lấy khóa có cấp độ <= mục tiêu, xếp tăng dần.
    let selected = all
      .filter((c) => idxOf(c.levelCode) <= targetIdx)
      .sort((a, b) => idxOf(a.levelCode) - idxOf(b.levelCode) || a.orderIndex - b.orderIndex);
    if (selected.length === 0) selected = all; // fallback nếu chưa có khóa đúng cấp

    const lessons = selected.flatMap((course) =>
      (course.units ?? [])
        .flatMap((unit) => unit.lessons ?? [])
        .filter((l) => l.isPublished),
    );

    for (let i = 0; i < lessons.length; i++) {
      await this.items.save(
        this.items.create({
          pathId: path.id,
          lessonId: lessons[i].id,
          orderIndex: i,
          status: i === 0 ? PathItemStatus.AVAILABLE : PathItemStatus.LOCKED,
          recommendedReason: `Phù hợp ${levelScale} ${targetLevel}`,
        }),
      );
    }
    return this.getPath(userId);
  }

  private defaultScale(languageCode: string) {
    if (languageCode === 'zh') return 'HSK';
    if (languageCode === 'ja') return 'JLPT';
    return 'CEFR';
  }

  private determineLevel(scale: string, score: number) {
    const levels = SCALE_LEVELS[scale] ?? SCALE_LEVELS.CEFR;
    const index = Math.min(levels.length - 1, Math.floor((score / 100) * levels.length));
    return levels[Math.max(0, index)];
  }
}
