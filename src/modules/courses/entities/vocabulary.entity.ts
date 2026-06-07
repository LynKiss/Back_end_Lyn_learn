import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Lesson } from './lesson.entity';

@Entity('vocabulary')
export class Vocabulary extends BaseEntity {
  @Index()
  @Column({ name: 'lesson_id', type: 'bigint', unsigned: true, nullable: true })
  lessonId: string | null;

  @ManyToOne(() => Lesson, (lesson) => lesson.vocabulary, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson | null;

  @Column({ length: 100 })
  word: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  phonetic: string | null;

  @Column({ name: 'part_of_speech', type: 'varchar', length: 30, nullable: true })
  partOfSpeech: string | null;

  @Column({ type: 'text' })
  meaning: string;

  @Column({ type: 'text', nullable: true })
  example: string | null;

  @Column({ name: 'audio_url', type: 'varchar', length: 500, nullable: true })
  audioUrl: string | null;
}
