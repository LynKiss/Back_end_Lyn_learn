import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionStatus } from '../../common/enums';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import { GamificationService } from '../gamification/gamification.service';
import { PersonalizationService } from '../personalization/personalization.service';
import { WritingSubmission } from './entities/writing-submission.entity';
import { WritingFeedback } from './entities/writing-feedback.entity';
import { CreateWritingSubmissionDto } from './dto/writing.dto';

const MIN_WORDS = 5;
const MAX_WORDS = 600;

@Injectable()
export class WritingService {
  private readonly logger = new Logger(WritingService.name);

  constructor(
    @InjectRepository(WritingSubmission)
    private readonly submissions: Repository<WritingSubmission>,
    @InjectRepository(WritingFeedback)
    private readonly feedbacks: Repository<WritingFeedback>,
    private readonly ai: AiService,
    private readonly users: UsersService,
    private readonly gamification: GamificationService,
    private readonly personalization: PersonalizationService,
  ) {}

  async submit(userId: string, dto: CreateWritingSubmissionDto) {
    const user = await this.users.getProfile(userId);
    const wordCount = dto.content.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < MIN_WORDS) {
      throw new BadRequestException(`Bài viết quá ngắn (tối thiểu ${MIN_WORDS} từ)`);
    }
    if (wordCount > MAX_WORDS) {
      throw new BadRequestException(`Bài viết quá dài (tối đa ${MAX_WORDS} từ)`);
    }
    const submission = await this.submissions.save(
      this.submissions.create({
        userId,
        exerciseId: dto.exerciseId ?? null,
        prompt: dto.prompt,
        content: dto.content,
        wordCount,
        status: SubmissionStatus.PENDING,
        submittedAt: new Date(),
      }),
    );

    try {
      const review = await this.ai.reviewWriting({
        prompt: dto.prompt,
        content: dto.content,
        targetLanguage: dto.targetLanguage ?? user.targetLanguage,
        feedbackLanguage: user.nativeLanguage,
      });
      await this.feedbacks.save(
        this.feedbacks.create({
          submissionId: submission.id,
          overallScore: Number(review.overallScore ?? 0),
          grammarScore: Number(review.grammarScore ?? 0),
          vocabularyScore: Number(review.vocabularyScore ?? 0),
          coherenceScore: Number(review.coherenceScore ?? 0),
          correctedText: review.correctedText ?? null,
          feedback: review,
          aiModel: this.ai.getReviewModel(),
        }),
      );
      submission.status = SubmissionStatus.REVIEWED;
      // Sinh mistake_events + mục ôn cá nhân từ lỗi bài viết.
      await this.personalization
        .recordWritingMistakes(userId, review, dto.content)
        .catch(() => {});
      // XP có targetId + trần ngày (chống farm).
      await this.gamification
        .awardXp(userId, 25, 'writing_submission', submission.id)
        .catch(() => {});
    } catch (err) {
      submission.status = SubmissionStatus.FAILED;
      this.logger.error(
        `Writing review failed for submission ${submission.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    await this.submissions.save(submission);
    return this.findOne(userId, submission.id);
  }

  findMine(userId: string) {
    return this.submissions.find({
      where: { userId },
      relations: { feedback: true },
      order: { submittedAt: 'DESC' },
    });
  }

  findOne(userId: string, id: string) {
    return this.submissions.findOneOrFail({
      where: { id, userId },
      relations: { feedback: true },
    });
  }
}
