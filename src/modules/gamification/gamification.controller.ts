import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GamificationService } from './gamification.service';

@ApiTags('gamification')
@Controller()
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Auth()
  @Get('gamification/me')
  me(@CurrentUser('id') userId: string) {
    return this.gamification.getMe(userId);
  }

  @Auth()
  @Get('gamification/hearts')
  hearts(@CurrentUser('id') userId: string) {
    return this.gamification.getHearts(userId);
  }

  @Auth()
  @Post('gamification/hearts/lose')
  loseHeart(@CurrentUser('id') userId: string) {
    return this.gamification.loseHeart(userId);
  }

  @Auth()
  @Get('gamification/daily')
  daily(@CurrentUser('id') userId: string) {
    return this.gamification.dailyQuests(userId);
  }

  @Get('leaderboard')
  leaderboard() {
    return this.gamification.leaderboard();
  }

  @Get('badges')
  badges() {
    return this.gamification.badgesList();
  }
}
