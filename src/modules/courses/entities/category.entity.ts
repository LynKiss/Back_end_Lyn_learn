import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 120 })
  slug: string;

  @Column({ length: 10, nullable: true, type: 'varchar' })
  icon: string | null; // emoji

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;
}
