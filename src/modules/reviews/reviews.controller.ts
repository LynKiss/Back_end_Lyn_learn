import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { CreateCourseReviewDto, UpdateCourseReviewDto } from './dto/course-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('courses/:courseId/reviews')
  list(@Param('courseId') courseId: string) {
    return this.reviews.list(courseId);
  }

  @Auth()
  @Post('courses/:courseId/reviews')
  create(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
    @Body() dto: CreateCourseReviewDto,
  ) {
    return this.reviews.upsert(userId, courseId, dto);
  }

  @Auth()
  @Patch('reviews/:id')
  update(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
    @Body() dto: UpdateCourseReviewDto,
  ) {
    return this.reviews.update(userId, role, id, dto);
  }

  @Auth()
  @Delete('reviews/:id')
  remove(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
  ) {
    return this.reviews.remove(userId, role, id);
  }
}
