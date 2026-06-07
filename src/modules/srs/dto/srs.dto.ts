import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReviewRating } from '../../../common/enums';

export class SaveVocabularyDto {
  @IsString()
  vocabularyId: string;
}

export class ReviewVocabularyDto {
  @IsOptional()
  @IsString()
  savedVocabularyId?: string;

  @ApiProperty({ enum: ReviewRating })
  @IsEnum(ReviewRating)
  rating: ReviewRating;
}
