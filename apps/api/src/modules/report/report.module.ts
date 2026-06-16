import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { ReportService } from './report.service.js';
import { RepoReportService } from './repo-report.service.js';
import { PdfService } from './pdf.service.js';
import { ReportController } from './report.controller.js';
import { WalrusModule } from '../walrus/walrus.module.js';

@Module({
  imports: [
    // forwardRef breaks the circular dependency:
    // AuditModule → ReportModule → AuditModule
    // AuditProcessor (in AuditModule) needs ReportService.generateHtml()
    // ReportService needs AuditRepository (exported by AuditModule)
    forwardRef(() => AuditModule),
    WalrusModule,
  ],
  controllers: [ReportController],
  providers: [ReportService, RepoReportService, PdfService],
  exports: [ReportService, RepoReportService, PdfService],
})
export class ReportModule {}
