import { Module } from '@nestjs/common';
import { AuditRunsController } from './audit-runs.controller.js';
import { AuditRunsService } from './audit-runs.service.js';
import { ReportModule } from '../report/report.module.js';
import { WalrusModule } from '../walrus/walrus.module.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [ReportModule, WalrusModule, UsersModule],
  controllers: [AuditRunsController],
  providers: [AuditRunsService],
  exports: [AuditRunsService],
})
export class AuditRunsModule {}
