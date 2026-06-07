import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { PathItemStatus } from '../../../common/enums';
import { LearningPath } from './learning-path.entity';
import { Lesson } from '../../courses/entities/lesson.entity';

@Entity('learning_path_items')
export class LearningPathItem extends BaseEntity {
  @Index()
  @Column({ name: 'path_id', type: 'bigint', unsigned: true })
  pathId: string;

  @ManyToOne(() => LearningPath, (path) => path.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'path_id' })
  path: LearningPath;

  @Index()
  @Column({ name: 'lesson_id', type: 'bigint', unsigned: true })
  lessonId: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ type: 'enum', enum: PathItemStatus, default: PathItemStatus.LOCKED })
  status: PathItemStatus;

  @Column({ name: 'recommended_reason', type: 'varchar', length: 255, nullable: true })
  recommendedReason: string | null;
}
