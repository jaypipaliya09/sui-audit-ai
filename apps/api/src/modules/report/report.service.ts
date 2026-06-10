import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { generateAuditReportHtml } from './templates/audit-report.template.js';
import type { AuditResult } from '../claude/types/finding.types.js';
import { AuditRepository } from '../audit/audit.repository.js';
import type { PaginatedAuditResponseDto } from '../audit/dto/audit-response.dto.js';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  // ─── HTML Generation ─────────────────────────────────────────────────────

  /**
   * Generate a self-contained HTML report string from an AuditResult.
   * Called by AuditProcessor after Claude returns findings.
   */
  generateHtml(result: AuditResult, contractName: string): string {
    this.logger.log(
      `Generating HTML report for "${contractName}" (${result.findings.length} findings)`,
    );
    const html = generateAuditReportHtml(result, contractName);
    this.logger.log(`HTML report generated (${html.length} bytes)`);
    return html;
  }

  // ─── Report Queries ───────────────────────────────────────────────────────

  /**
   * Paginated list of all audits, most recent first.
   * contractCode is excluded to keep payloads small.
   */
  async findAll(params: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<PaginatedAuditResponseDto> {
    const { page, limit } = params;
    const { data, total } = await this.auditRepository.findAll({
      page,
      limit,
      status: params.status as any,
    });

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Single audit record by ID (includes findingsJson).
   */
  async findById(id: string) {
    const audit = await this.auditRepository.findById(id);
    if (!audit) {
      throw new NotFoundException(`Report "${id}" not found`);
    }
    return audit;
  }

  /**
   * Single audit record by Walrus blobId — used for shareable links.
   */
  async findByBlobId(blobId: string) {
    const audit = await this.auditRepository.findByBlobId(blobId);
    if (!audit) {
      throw new NotFoundException(`No report found for blobId "${blobId}"`);
    }
    return audit;
  }
}
