import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewVocabularyDto } from './dto/srs.dto';
import { SrsService } from './srs.service';

@ApiTags('srs')
@Auth()
@Controller()
export class SrsController {
  constructor(private readonly srs: SrsService) {}

  @Post('vocabulary/:id/save')
  save(@CurrentUser('id') userId: string, @Param('id') vocabularyId: string) {
    return this.srs.saveWord(userId, vocabularyId);
  }

  @Delete('vocabulary/:id/save')
  unsave(@CurrentUser('id') userId: string, @Param('id') vocabularyId: string) {
    return this.srs.unsaveWord(userId, vocabularyId);
  }

  @Get('vocabulary/my')
  mine(@CurrentUser('id') userId: string) {
    return this.srs.myWords(userId);
  }

  @Get('srs/due')
  due(@CurrentUser('id') userId: string) {
    return this.srs.due(userId);
  }

  @Post('srs/reviews/:savedVocabularyId')
  review(
    @CurrentUser('id') userId: string,
    @Param('savedVocabularyId') savedVocabularyId: string,
    @Body() dto: ReviewVocabularyDto,
  ) {
    return this.srs.review(userId, savedVocabularyId, dto.rating);
  }

  @Post('srs/reviews')
  reviewBody(@CurrentUser('id') userId: string, @Body() dto: ReviewVocabularyDto) {
    return this.srs.review(userId, dto.savedVocabularyId ?? '', dto.rating);
  }
}
