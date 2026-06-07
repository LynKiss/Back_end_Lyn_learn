import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from './entities/unit.entity';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';
import { CoursesService } from './courses.service';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitsRepo: Repository<Unit>,
    private readonly coursesService: CoursesService,
  ) {}

  async create(courseId: string, dto: CreateUnitDto): Promise<Unit> {
    await this.coursesService.findById(courseId); // đảm bảo khóa học tồn tại
    const unit = this.unitsRepo.create({ ...dto, courseId });
    return this.unitsRepo.save(unit);
  }

  async findById(id: string): Promise<Unit> {
    const unit = await this.unitsRepo.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Không tìm thấy chương');
    return unit;
  }

  async update(id: string, dto: UpdateUnitDto): Promise<Unit> {
    const unit = await this.findById(id);
    Object.assign(unit, dto);
    return this.unitsRepo.save(unit);
  }

  async remove(id: string): Promise<void> {
    const result = await this.unitsRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Không tìm thấy chương');
  }
}
