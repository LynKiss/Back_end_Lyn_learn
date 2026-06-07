import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class EnrollDto {
  @ApiProperty({ description: 'ID khóa học muốn ghi danh' })
  @IsString()
  courseId: string;
}

export class CompleteLessonDto {
  @ApiPropertyOptional({ description: 'Điểm bài học (0-100)', example: 90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;
}

export class SubmitAttemptDto {
  @ApiProperty({
    description: 'Câu trả lời của học viên (cấu trúc tùy loại bài tập)',
    example: { selectedIndex: 0 },
  })
  @IsObject()
  answer: Record<string, unknown>;
}
