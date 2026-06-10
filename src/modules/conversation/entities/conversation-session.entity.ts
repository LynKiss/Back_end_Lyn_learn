import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

// Một phiên hội thoại luyện nói với AI.
@Entity('ai_conversation_sessions')
export class ConversationSession extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @Column({ type: 'varchar', length: 32 })
  scenario: string; // cafe | travel | interview | business | daily

  @Column({ name: 'target_language', type: 'varchar', length: 8 })
  targetLanguage: string;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string; // active | finished

  @Column({ type: 'json', nullable: true })
  summary: unknown;

  @Column({ name: 'finished_at', type: 'datetime', nullable: true })
  finishedAt: Date | null;
}
