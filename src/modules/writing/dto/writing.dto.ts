import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWritingSubmissionDto {
  @ApiProperty({ example: 'Write an email to ask for a meeting.' })
  @IsString()
  @MaxLength(2000)
  prompt: string;

  @ApiProperty({ example: 'Dear Mr. Lee, I would like to...' })
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  targetLanguage?: string;
}
