import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Vocabulary } from '../../courses/entities/vocabulary.entity';
import { User } from '../../users/entities/user.entity';
import { FlashcardDeck } from './flashcard-deck.entity';

@Entity('saved_vocabulary')
@Index(['userId', 'vocabularyId'], { unique: true })
export class SavedVocabulary extends BaseEntity {
  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'vocabulary_id', type: 'bigint', unsigned: true })
  vocabularyId: string;

  @ManyToOne(() => Vocabulary, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vocabulary_id' })
  vocabulary: Vocabulary;

  @Column({ name: 'deck_id', type: 'bigint', unsigned: true, nullable: true })
  deckId: string | null;

  @ManyToOne(() => FlashcardDeck, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'deck_id' })
  deck: FlashcardDeck | null;

  @Column({ name: 'ease_factor', type: 'decimal', precision: 4, scale: 2, default: 2.5 })
  easeFactor: number;

  @Column({ name: 'interval_days', type: 'int', default: 0 })
  intervalDays: number;

  @Column({ name: 'due_at', type: 'datetime' })
  dueAt: Date;

  @Column({ name: 'last_reviewed_at', type: 'datetime', nullable: true })
  lastReviewedAt: Date | null;
}
