import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import { GamificationService } from '../gamification/gamification.service';
import { PersonalizationService } from '../personalization/personalization.service';
import { ConversationSession } from './entities/conversation-session.entity';
import { ConversationTurn } from './entities/conversation-turn.entity';
import { SpeakingTurnFeedback } from './entities/speaking-turn-feedback.entity';
import { AddTurnDto, CreateConversationDto } from './dto/conversation.dto';

const SCENARIO_TITLE: Record<string, string> = {
  cafe: 'Ordering at a cafe',
  travel: 'At the airport',
  interview: 'Job interview',
  business: 'Business meeting',
  daily: 'Daily chat',
};

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(ConversationSession)
    private readonly sessions: Repository<ConversationSession>,
    @InjectRepository(ConversationTurn)
    private readonly turns: Repository<ConversationTurn>,
    @InjectRepository(SpeakingTurnFeedback)
    private readonly feedbacks: Repository<SpeakingTurnFeedback>,
    private readonly ai: AiService,
    private readonly users: UsersService,
    private readonly gamification: GamificationService,
    private readonly personalization: PersonalizationService,
  ) {}

  async create(userId: string, dto: CreateConversationDto) {
    const user = await this.users.getProfile(userId);
    const targetLanguage = dto.targetLanguage ?? user.targetLanguage ?? 'en';
    const session = await this.sessions.save(
      this.sessions.create({
        userId,
        scenario: dto.scenario,
        targetLanguage,
        title: SCENARIO_TITLE[dto.scenario] ?? 'Conversation',
        status: 'active',
        summary: null,
        finishedAt: null,
      }),
    );
    // Lượt mở đầu của AI.
    const opening = await this.ai.conversationReply({
      scenario: dto.scenario,
      targetLanguage,
      history: [],
    });
    await this.turns.save(
      this.turns.create({ sessionId: session.id, role: 'assistant', text: opening, audioUrl: null }),
    );
    return this.getOne(userId, session.id);
  }

  list(userId: string) {
    return this.sessions.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async getOne(userId: string, id: string) {
    const session = await this.sessions.findOne({ where: { id, userId } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên hội thoại');
    const turns = await this.turns.find({
      where: { sessionId: id },
      relations: { feedback: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return { ...session, turns };
  }

  async addTurn(userId: string, id: string, dto: AddTurnDto) {
    const session = await this.sessions.findOne({ where: { id, userId } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên hội thoại');
    if (session.status !== 'active') {
      throw new ForbiddenException('Phiên hội thoại đã kết thúc');
    }

    // 1) Lưu lượt của người học.
    const userTurn = await this.turns.save(
      this.turns.create({
        sessionId: id,
        role: 'user',
        text: dto.text,
        audioUrl: dto.audioUrl ?? null,
      }),
    );

    // 2) Chấm lượt nói + lưu feedback.
    const score = await this.ai.scoreSpeakingTurn({
      targetLanguage: session.targetLanguage,
      scenario: session.scenario,
      text: dto.text,
    });
    const feedback = await this.feedbacks.save(
      this.feedbacks.create({
        turnId: userTurn.id,
        pronunciationScore: score.pronunciationScore,
        fluencyScore: score.fluencyScore,
        grammarScore: score.grammarScore,
        vocabularyScore: score.vocabularyScore,
        naturalnessScore: score.naturalnessScore,
        taskCompletionScore: score.taskCompletionScore,
        corrections: score.corrections,
      }),
    );

    // 3) Sinh mistake_events + mục ôn từ lỗi speaking.
    await this.personalization
      .recordSpeakingTurn(userId, { corrections: score.corrections, text: dto.text })
      .catch(() => {});

    // 4) AI trả lời tiếp theo ngữ cảnh.
    const history = await this.turns.find({
      where: { sessionId: id },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    const reply = await this.ai.conversationReply({
      scenario: session.scenario,
      targetLanguage: session.targetLanguage,
      history: history.map((h) => ({ role: h.role, text: h.text })),
    });
    const assistantTurn = await this.turns.save(
      this.turns.create({ sessionId: id, role: 'assistant', text: reply, audioUrl: null }),
    );

    // XP nhỏ cho mỗi lượt (có trần ngày, không farm vô hạn).
    await this.gamification
      .awardXp(userId, 4, 'conversation_turn', userTurn.id)
      .catch(() => {});

    return {
      userTurn,
      feedback,
      assistantTurn,
    };
  }

  async finish(userId: string, id: string) {
    const session = await this.sessions.findOne({ where: { id, userId } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên hội thoại');
    if (session.status === 'finished') return this.getOne(userId, id);

    const userTurns = await this.turns.find({
      where: { sessionId: id, role: 'user' },
      relations: { feedback: true },
    });
    const fbs = userTurns.map((t) => t.feedback).filter(Boolean) as SpeakingTurnFeedback[];
    const avg = (sel: (f: SpeakingTurnFeedback) => number) =>
      fbs.length ? Math.round((fbs.reduce((s, f) => s + sel(f), 0) / fbs.length) * 10) / 10 : 0;

    session.summary = {
      turns: userTurns.length,
      pronunciation: avg((f) => f.pronunciationScore),
      fluency: avg((f) => f.fluencyScore),
      grammar: avg((f) => f.grammarScore),
      vocabulary: avg((f) => f.vocabularyScore),
      naturalness: avg((f) => f.naturalnessScore),
      taskCompletion: avg((f) => f.taskCompletionScore),
      mistakes: fbs.reduce(
        (s, f) => s + (Array.isArray(f.corrections) ? f.corrections.length : 0),
        0,
      ),
    };
    session.status = 'finished';
    session.finishedAt = new Date();
    await this.sessions.save(session);

    // Thưởng XP một lần khi hoàn thành phiên (có trần ngày).
    await this.gamification
      .awardXp(userId, 25, 'conversation_finished', session.id)
      .catch(() => {});

    return this.getOne(userId, id);
  }
}
