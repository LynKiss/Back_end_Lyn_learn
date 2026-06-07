import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { join, normalize } from 'path';
import { Repository } from 'typeorm';
import { SubmissionStatus } from '../../common/enums';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import { GamificationService } from '../gamification/gamification.service';
import { SpeakingFeedback } from './entities/speaking-feedback.entity';
import { SpeakingSubmission } from './entities/speaking-submission.entity';
import { CreateSpeakingSubmissionDto } from './dto/speaking.dto';

@Injectable()
export class SpeakingService {
  constructor(
    @InjectRepository(SpeakingSubmission)
    private readonly submissions: Repository<SpeakingSubmission>,
    @InjectRepository(SpeakingFeedback)
    private readonly feedbacks: Repository<SpeakingFeedback>,
    private readonly ai: AiService,
    private readonly users: UsersService,
    private readonly gamification: GamificationService,
  ) {}

  async submit(userId: string, dto: CreateSpeakingSubmissionDto) {
    const user = await this.users.getProfile(userId);
    const submission = await this.submissions.save(
      this.submissions.create({
        userId,
        exerciseId: dto.exerciseId ?? null,
        prompt: dto.prompt,
        audioUrl: dto.audioUrl,
        durationSeconds: dto.durationSeconds ?? 0,
        status: SubmissionStatus.TRANSCRIBING,
        submittedAt: new Date(),
      }),
    );

    try {
      // Ưu tiên STT server (OpenAI) nếu được cấu hình; nếu không, dùng transcript
      // do client gửi lên (vd Web Speech API) để vẫn chấm được trên gói miễn phí.
      let transcript = dto.transcript?.trim() ?? '';
      if (this.ai.canTranscribe()) {
        transcript = await this.ai.transcribeAudio(
          this.localPathFromUrl(dto.audioUrl),
          dto.mimeType ?? 'audio/webm',
        );
      }
      if (!transcript) {
        throw new Error(
          'Chưa có nội dung lời nói: cấu hình OPENAI_API_KEY hoặc gửi kèm transcript.',
        );
      }
      submission.transcript = transcript;
      const review = await this.ai.reviewSpeaking({
        prompt: dto.prompt,
        transcript,
        targetLanguage: dto.targetLanguage ?? user.targetLanguage,
        feedbackLanguage: user.nativeLanguage,
      });
      await this.feedbacks.save(
        this.feedbacks.create({
          submissionId: submission.id,
          pronunciationScore: Number(review.pronunciationScore ?? 0),
          fluencyScore: Number(review.fluencyScore ?? 0),
          accuracyScore: Number(review.accuracyScore ?? 0),
          feedback: review,
          aiModel: this.ai.getReviewModel(),
        }),
      );
      submission.status = SubmissionStatus.REVIEWED;
      await this.gamification.awardXp(userId, 30, 'speaking_submission');
    } catch {
      submission.status = SubmissionStatus.FAILED;
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

  private localPathFromUrl(url: string) {
    const clean = url.replace(/^\/+/, '');
    if (!clean.startsWith('uploads/')) throw new Error('Invalid local upload URL');
    return normalize(join(process.cwd(), clean));
  }
}
