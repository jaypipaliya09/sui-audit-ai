import { Injectable, Logger } from '@nestjs/common';
import { generateAuditReportHtml } from './templates/audit-report.template.js';
import type { AuditResult } from '../claude/types/finding.types.js';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  /**
   * Generate a self-contained HTML report string from an AuditResult.
   *
   * @param result       - The structured AuditResult from Claude
   * @param contractName - Human-readable contract name
   * @returns Full HTML string ready for storage on Walrus
   */
  generateHtml(result: AuditResult, contractName: string): string {
    this.logger.log(
      `Generating HTML report for "${contractName}" (${result.findings.length} findings)`,
    );

    const html = generateAuditReportHtml(result, contractName);

    this.logger.log(
      `HTML report generated (${html.length} bytes)`,
    );

    return html;
  }
}
