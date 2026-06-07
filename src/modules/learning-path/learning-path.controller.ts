import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePlacementAttemptDto } from './dto/learning-path.dto';
import { LearningPathService } from './learning-path.service';

@ApiTags('learning-path')
@Auth()
@Controller()
export class LearningPathController {
  constructor(private readonly learningPath: LearningPathService) {}

  @Post('placement/attempts')
  placement(@CurrentUser('id') userId: string, @Body() dto: CreatePlacementAttemptDto) {
    return this.learningPath.submitPlacement(userId, dto);
  }

  @Get('learning-path')
  path(@CurrentUser('id') userId: string) {
    return this.learningPath.getPath(userId);
  }

  @Post('learning-path/items/:id/complete')
  complete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.learningPath.completeItem(userId, id);
  }
}
