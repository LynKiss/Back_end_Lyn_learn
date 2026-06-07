import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { LessonsService } from './lessons.service';
import { UpdateUnitDto } from './dto/unit.dto';
import { CreateLessonDto } from './dto/lesson.dto';
import { Admin } from '../../common/decorators/admin.decorator';

@ApiTags('units')
@Controller('units')
export class UnitsController {
  constructor(
    private readonly unitsService: UnitsService,
    private readonly lessonsService: LessonsService,
  ) {}

  @Admin()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }

  // Tạo bài học trong chương.
  @Admin()
  @Post(':unitId/lessons')
  createLesson(@Param('unitId') unitId: string, @Body() dto: CreateLessonDto) {
    return this.lessonsService.create(unitId, dto);
  }
}
