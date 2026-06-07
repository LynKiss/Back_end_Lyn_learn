import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';

@Entity('units')
export class Unit extends BaseEntity {
  @Index()
  @Column({ name: 'course_id', type: 'bigint', unsigned: true })
  courseId: string;

  @ManyToOne(() => Course, (course) => course.units, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @OneToMany(() => Lesson, (lesson) => lesson.unit)
  lessons: Lesson[];
}
