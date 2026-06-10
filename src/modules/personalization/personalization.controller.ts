import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PersonalizationService } from './personalization.service';

@ApiTags('personalization')
@Auth()
@Controller('personalization')
export class PersonalizationController {
  constructor(private readonly service: PersonalizationService) {}

  @Get('mastery')
  mastery(@CurrentUser('id') userId: string) {
    return this.service.getMastery(userId);
  }

  @Get('mistakes')
  mistakes(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRecentMistakes(userId, Number(limit) || 20);
  }

  @Get('review-items')
  reviewItems(@CurrentUser('id') userId: string) {
    return this.service.getReviewItems(userId);
  }

  @Post('review-items/:id/resolve')
  resolve(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.resolveReviewItem(userId, id);
  }
}
