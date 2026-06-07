import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ExerciseType } from '../../../common/enums';

export class CreateExerciseDto {
  @ApiProperty({ enum: ExerciseType, example: ExerciseType.MCQ })
  @IsEnum(ExerciseType)
  type: ExerciseType;

  @ApiProperty({ example: 'Chọn từ đúng nghĩa với "family"' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Cấu hình bài (vd MCQ: { options: ["...","..."] })',
  })
  @IsOptional()
  content?: unknown;

  @ApiPropertyOptional({
    description: 'Đáp án đúng (vd MCQ: { correctIndex: 0 })',
  })
  @IsOptional()
  answer?: unknown;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}

export class UpdateExerciseDto extends PartialType(CreateExerciseDto) {}
