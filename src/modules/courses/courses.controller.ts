import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { UnitsService } from './units.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { CreateUnitDto } from './dto/unit.dto';
import { Admin } from '../../common/decorators/admin.decorator';
import { CefrLevel, LevelScale } from '../../common/enums';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly unitsService: UnitsService,
  ) {}

  // Học viên: chỉ thấy khóa đã xuất bản. Admin: thêm ?all=true để xem tất cả.
  // Hỗ trợ tìm kiếm/lọc: ?search=&level=&categoryId=
  @Get()
  findAll(
    @Query('all') all?: string,
    @Query('search') search?: string,
    @Query('level') level?: CefrLevel,
    @Query('languageCode') languageCode?: string,
    @Query('levelScale') levelScale?: LevelScale,
    @Query('levelCode') levelCode?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.coursesService.findAll({
      publishedOnly: all !== 'true',
      search,
      level,
      languageCode,
      levelScale,
      levelCode,
      categoryId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Admin()
  @Post()
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Admin()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

  // Tạo chương trong khóa học.
  @Admin()
  @Post(':courseId/units')
  createUnit(@Param('courseId') courseId: string, @Body() dto: CreateUnitDto) {
    return this.unitsService.create(courseId, dto);
  }
}
