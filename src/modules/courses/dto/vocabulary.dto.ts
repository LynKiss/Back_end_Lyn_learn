import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVocabularyDto {
  @ApiProperty({ example: 'family' })
  @IsString()
  @MaxLength(100)
  word: string;

  @ApiPropertyOptional({ example: '/ˈfæm.əl.i/' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phonetic?: string;

  @ApiPropertyOptional({ example: 'noun' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  partOfSpeech?: string;

  @ApiProperty({ example: 'gia đình' })
  @IsString()
  meaning: string;

  @ApiPropertyOptional({ example: 'My family is big.' })
  @IsOptional()
  @IsString()
  example?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  audioUrl?: string;
}

export class UpdateVocabularyDto extends PartialType(CreateVocabularyDto) {}
