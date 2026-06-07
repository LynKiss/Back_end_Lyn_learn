import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vocabulary } from '../courses/entities/vocabulary.entity';
import { GamificationModule } from '../gamification/gamification.module';
import { FlashcardDeck } from './entities/flashcard-deck.entity';
import { SavedVocabulary } from './entities/saved-vocabulary.entity';
import { VocabularyReview } from './entities/vocabulary-review.entity';
import { SrsController } from './srs.controller';
import { SrsService } from './srs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FlashcardDeck,
      SavedVocabulary,
      VocabularyReview,
      Vocabulary,
    ]),
    GamificationModule,
  ],
  controllers: [SrsController],
  providers: [SrsService],
})
export class SrsModule {}
