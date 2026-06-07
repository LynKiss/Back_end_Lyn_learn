import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { LessonType } from '../../../common/enums';
import { Unit } from './unit.entity';
import { Exercise } from './exercise.entity';
import { Vocabulary } from './vocabulary.entity';

@Entity('lessons')
export class Lesson extends BaseEntity {
  @Index()
  @Column({ name: 'unit_id', type: 'bigint', unsigned: true })
  unitId: string;

  @ManyToOne(() => Unit, (unit) => unit.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column({ length: 200 })
  title: string;

  @Index()
  @Column({ length: 220 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'lesson_type', type: 'enum', enum: LessonType })
  lessonType: LessonType;

  @Column({ type: 'json', nullable: true })
  content: unknown;

  @Column({ name: 'estimated_minutes', type: 'int', default: 10 })
  estimatedMinutes: number;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @OneToMany(() => Exercise, (exercise) => exercise.lesson)
  exercises: Exercise[];

  @OneToMany(() => Vocabulary, (vocab) => vocab.lesson)
  vocabulary: Vocabulary[];
}
