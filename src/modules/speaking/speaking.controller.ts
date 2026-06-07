import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateSpeakingSubmissionDto } from './dto/speaking.dto';
import { SpeakingService } from './speaking.service';

@ApiTags('speaking')
@Auth()
@Controller('speaking/submissions')
export class SpeakingController {
  constructor(private readonly speaking: SpeakingService) {}

  @Post()
  submit(@CurrentUser('id') userId: string, @Body() dto: CreateSpeakingSubmissionDto) {
    return this.speaking.submit(userId, dto);
  }

  @Get()
  mine(@CurrentUser('id') userId: string) {
    return this.speaking.findMine(userId);
  }

  @Get(':id')
  one(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.speaking.findOne(userId, id);
  }
}
