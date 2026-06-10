import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  // Ghi nhật ký; không bao giờ làm hỏng luồng chính nếu lỗi.
  async record(entry: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  }): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          actorId: entry.actorId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          before: entry.before ?? null,
          after: entry.after ?? null,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Audit log failed (${entry.action}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  list(limit = 100) {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: Math.min(limit, 200) });
  }
}
