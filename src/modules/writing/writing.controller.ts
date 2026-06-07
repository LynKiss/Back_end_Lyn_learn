import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateWritingSubmissionDto } from './dto/writing.dto';
import { WritingService } from './writing.service';

@ApiTags('writing')
@Auth()
@Controller('writing/submissions')
export class WritingController {
  constructor(private readonly writing: WritingService) {}

  @Post()
  submit(@CurrentUser('id') userId: string, @Body() dto: CreateWritingSubmissionDto) {
    return this.writing.submit(userId, dto);
  }

  @Get()
  mine(@CurrentUser('id') userId: string) {
    return this.writing.findMine(userId);
  }

  @Get(':id')
  one(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.writing.findOne(userId, id);
  }
}
