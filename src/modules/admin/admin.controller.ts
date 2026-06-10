import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { Admin } from '../../common/decorators/admin.decorator';

@ApiTags('admin')
@Admin()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Get('stats')
  stats() {
    return this.adminService.getStats();
  }

  @Get('content-health')
  contentHealth() {
    return this.adminService.getContentHealth();
  }

  @Get('audit-logs')
  auditLogs(@Query('limit') limit?: string) {
    return this.audit.list(Number(limit) || 100);
  }
}
