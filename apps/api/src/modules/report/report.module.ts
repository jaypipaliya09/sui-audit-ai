import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { ReportService } from './report.service.js';
import { RepoReportService } from './repo-report.service.js';
import { ReportController } from './report.controller.js';

@Module({
  imports: [
    // forwardRef breaks the circular dependency:
    // AuditModule → ReportModule → AuditModule
    // AuditProcessor (in AuditModule) needs ReportService.generateHtml()
    // ReportService needs AuditRepository (exported by AuditModule)
    forwardRef(() => AuditModule),
  ],
  controllers: [ReportController],
  providers: [ReportService, RepoReportService],
  exports: [ReportService, RepoReportService],
})
export class ReportModule {}
