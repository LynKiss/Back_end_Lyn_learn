import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

// Nhật ký hành động quản trị (ai làm gì, trên thực thể nào, trước/sau).
@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Index()
  @Column({ name: 'actor_id', type: 'bigint', unsigned: true, nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 64 })
  action: string; // vd: lesson.publish, course.update, exercise.delete

  @Index()
  @Column({ name: 'entity_type', type: 'varchar', length: 40 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 40, nullable: true })
  entityId: string | null;

  @Column({ type: 'json', nullable: true })
  before: unknown;

  @Column({ type: 'json', nullable: true })
  after: unknown;
}
