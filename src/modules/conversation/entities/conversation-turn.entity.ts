import { Entity, Column, Index, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { SpeakingTurnFeedback } from './speaking-turn-feedback.entity';

// Một lượt nói trong phiên hội thoại (AI hoặc người học).
@Entity('ai_conversation_turns')
export class ConversationTurn extends BaseEntity {
  @Index()
  @Column({ name: 'session_id', type: 'bigint', unsigned: true })
  sessionId: string;

  @Column({ type: 'varchar', length: 16 })
  role: string; // assistant | user

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'audio_url', type: 'varchar', length: 512, nullable: true })
  audioUrl: string | null;

  @OneToOne(() => SpeakingTurnFeedback, (f) => f.turn)
  feedback?: SpeakingTurnFeedback;
}
