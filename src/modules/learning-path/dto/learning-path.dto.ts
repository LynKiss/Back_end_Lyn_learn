import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePlacementAttemptDto {
  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  languageCode?: string;

  @ApiPropertyOptional({ example: 'CEFR' })
  @IsOptional()
  @IsString()
  levelScale?: string;

  @ApiPropertyOptional({ example: 68 })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}
