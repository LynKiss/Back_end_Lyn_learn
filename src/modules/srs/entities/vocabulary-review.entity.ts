import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { ReviewRating } from '../../../common/enums';
import { SavedVocabulary } from './saved-vocabulary.entity';

@Entity('vocabulary_reviews')
@Index(['savedVocabularyId', 'reviewedAt'])
export class VocabularyReview extends BaseEntity {
  @Column({ name: 'saved_vocabulary_id', type: 'bigint', unsigned: true })
  savedVocabularyId: string;

  @ManyToOne(() => SavedVocabulary, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saved_vocabulary_id' })
  savedVocabulary: SavedVocabulary;

  @Column({ type: 'enum', enum: ReviewRating })
  rating: ReviewRating;

  @Column({ name: 'reviewed_at', type: 'datetime' })
  reviewedAt: Date;
}
