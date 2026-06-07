import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSpeakingSubmissionDto {
  @ApiProperty({ example: 'Introduce yourself in 30 seconds.' })
  @IsString()
  prompt: string;

  @ApiProperty({ example: '/uploads/recording.webm' })
  @IsString()
  audioUrl: string;

  @ApiPropertyOptional({ example: 'audio/webm' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  durationSeconds?: number;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  targetLanguage?: string;

  @ApiPropertyOptional({
    description:
      'Bản ghi lời nói sẵn (vd từ Web Speech API trên trình duyệt). Dùng khi server chưa cấu hình STT trả phí.',
  })
  @IsOptional()
  @IsString()
  transcript?: string;
}
