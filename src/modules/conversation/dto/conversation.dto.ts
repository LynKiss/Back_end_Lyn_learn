import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const SCENARIOS = [
  'cafe',
  'travel',
  'interview',
  'business',
  'daily',
] as const;

export class CreateConversationDto {
  @IsIn(SCENARIOS as unknown as string[])
  scenario: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  targetLanguage?: string;
}

export class AddTurnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  audioUrl?: string;
}
