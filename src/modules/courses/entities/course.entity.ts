import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { CefrLevel, LevelScale } from '../../../common/enums';
import { Unit } from './unit.entity';
import { Category } from './category.entity';

@Entity('courses')
export class Course extends BaseEntity {
  @Column({ length: 200 })
  title: string;

  @Index({ unique: true })
  @Column({ length: 220 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 20, default: 'en' })
  language: string;

  @Column({ type: 'enum', enum: CefrLevel, nullable: true })
  level: CefrLevel | null;

  @Index()
  @Column({ name: 'language_code', length: 20, default: 'en' })
  languageCode: string;

  @Index()
  @Column({
    name: 'level_scale',
    type: 'enum',
    enum: LevelScale,
    default: LevelScale.CEFR,
  })
  levelScale: LevelScale;

  @Index()
  @Column({ name: 'level_code', length: 20, default: 'A1' })
  levelCode: string;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string | null;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Index()
  @Column({ name: 'category_id', type: 'bigint', unsigned: true, nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @OneToMany(() => Unit, (unit) => unit.course)
  units: Unit[];
}
