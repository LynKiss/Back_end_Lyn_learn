import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { ExerciseType } from '../../../common/enums';
import { Lesson } from './lesson.entity';

@Entity('exercises')
export class Exercise extends BaseEntity {
  @Index()
  @Column({ name: 'lesson_id', type: 'bigint', unsigned: true })
  lessonId: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.exercises, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ type: 'enum', enum: ExerciseType })
  type: ExerciseType;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'json', nullable: true })
  content: unknown;

  @Column({ type: 'json', nullable: true })
  answer: unknown;

  @Column({ type: 'int', default: 10 })
  points: number;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;
}
