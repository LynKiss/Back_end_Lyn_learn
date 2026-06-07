import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vocabulary } from './entities/vocabulary.entity';
import { CreateVocabularyDto, UpdateVocabularyDto } from './dto/vocabulary.dto';
import { LessonsService } from './lessons.service';

@Injectable()
export class VocabularyService {
  constructor(
    @InjectRepository(Vocabulary)
    private readonly vocabRepo: Repository<Vocabulary>,
    private readonly lessonsService: LessonsService,
  ) {}

  async create(lessonId: string, dto: CreateVocabularyDto): Promise<Vocabulary> {
    await this.lessonsService.findById(lessonId);
    const vocab = this.vocabRepo.create({ ...dto, lessonId });
    return this.vocabRepo.save(vocab);
  }

  async update(id: string, dto: UpdateVocabularyDto): Promise<Vocabulary> {
    const vocab = await this.vocabRepo.findOne({ where: { id } });
    if (!vocab) throw new NotFoundException('Không tìm thấy từ vựng');
    Object.assign(vocab, dto);
    return this.vocabRepo.save(vocab);
  }

  async remove(id: string): Promise<void> {
    const result = await this.vocabRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Không tìm thấy từ vựng');
  }
}
