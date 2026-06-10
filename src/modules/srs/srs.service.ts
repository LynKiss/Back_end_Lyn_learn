import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ReviewRating } from '../../common/enums';
import { Vocabulary } from '../courses/entities/vocabulary.entity';
import { GamificationService } from '../gamification/gamification.service';
import { SavedVocabulary } from './entities/saved-vocabulary.entity';
import { VocabularyReview } from './entities/vocabulary-review.entity';

@Injectable()
export class SrsService {
  constructor(
    @InjectRepository(SavedVocabulary)
    private readonly saved: Repository<SavedVocabulary>,
    @InjectRepository(VocabularyReview)
    private readonly reviews: Repository<VocabularyReview>,
    @InjectRepository(Vocabulary)
    private readonly vocabulary: Repository<Vocabulary>,
    private readonly gamification: GamificationService,
  ) {}

  async saveWord(userId: string, vocabularyId: string) {
    const word = await this.vocabulary.findOne({ where: { id: vocabularyId } });
    if (!word) throw new NotFoundException('Không tìm thấy từ vựng');
    const existing = await this.saved.findOne({ where: { userId, vocabularyId } });
    if (existing) return existing;
    return this.saved.save(
      this.saved.create({
        userId,
        vocabularyId,
        dueAt: new Date(),
        easeFactor: 2.5,
        intervalDays: 0,
      }),
    );
  }

  async unsaveWord(userId: string, vocabularyId: string) {
    await this.saved.delete({ userId, vocabularyId });
  }

  myWords(userId: string) {
    return this.saved.find({
      where: { userId },
      relations: { vocabulary: true },
      order: { dueAt: 'ASC' },
    });
  }

  due(userId: string) {
    return this.saved.find({
      where: { userId, dueAt: LessThanOrEqual(new Date()) },
      relations: { vocabulary: true },
      order: { dueAt: 'ASC' },
      take: 50,
    });
  }

  async review(userId: string, savedVocabularyId: string, rating: ReviewRating) {
    const item = await this.saved.findOne({
      where: { id: savedVocabularyId, userId },
      relations: { vocabulary: true },
    });
    if (!item) throw new NotFoundException('Không tìm thấy flashcard');

    // Chống farm XP: chỉ thưởng khi thẻ THỰC SỰ đến hạn trước khi ôn.
    // Dung sai 2s để bù việc cột datetime (không có mili-giây) làm tròn dueAt lên.
    const wasDue = new Date(item.dueAt).getTime() <= Date.now() + 2000;

    this.applySm2(item, rating);
    await this.saved.save(item);
    await this.reviews.save(
      this.reviews.create({ savedVocabularyId: item.id, rating, reviewedAt: new Date() }),
    );
    if (wasDue) {
      // Cộng XP một lần/thẻ/ngày qua targetId (gamification tự khử trùng theo ngày).
      await this.gamification
        .awardXp(userId, 3, 'srs_review', item.id)
        .catch(() => {});
    }
    return item;
  }

  private applySm2(item: SavedVocabulary, rating: ReviewRating) {
    const quality = {
      [ReviewRating.AGAIN]: 1,
      [ReviewRating.HARD]: 3,
      [ReviewRating.GOOD]: 4,
      [ReviewRating.EASY]: 5,
    }[rating];

    if (quality < 3) {
      item.intervalDays = 1;
      item.easeFactor = Math.max(1.3, Number(item.easeFactor) - 0.2);
    } else {
      const previous = item.intervalDays || 1;
      const multiplier = rating === ReviewRating.EASY ? 1.5 : rating === ReviewRating.HARD ? 0.8 : 1;
      item.easeFactor = Math.max(
        1.3,
        Number(item.easeFactor) + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
      );
      item.intervalDays =
        previous <= 1 ? (rating === ReviewRating.EASY ? 4 : 2) : Math.ceil(previous * Number(item.easeFactor) * multiplier);
    }

    const due = new Date();
    due.setDate(due.getDate() + item.intervalDays);
    item.dueAt = due;
    item.lastReviewedAt = new Date();
  }
}
