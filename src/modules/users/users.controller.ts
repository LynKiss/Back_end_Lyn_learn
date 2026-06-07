import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { Admin } from '../../common/decorators/admin.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Danh sách người dùng — chỉ admin.
  @Admin()
  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      currentLevel: u.currentLevel,
      isActive: u.isActive,
      totalXp: u.profile?.totalXp ?? 0,
      currentStreak: u.profile?.currentStreak ?? 0,
      createdAt: u.createdAt,
    }));
  }

  // Hồ sơ của chính mình.
  @Auth()
  @Get('me/profile')
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Auth()
  @Patch('me/profile')
  updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }
}
