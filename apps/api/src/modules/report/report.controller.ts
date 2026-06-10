import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ReportService } from './report.service.js';

/**
 * ReportController — read-only REST endpoints for browsing audit reports.
 *
 * Routes:
 *   GET /reports                  → paginated list
 *   GET /reports/blob/:blobId     → fetch by Walrus blobId (shareable link)
 *   GET /reports/:id              → single report with full findingsJson
 *
 * NOTE: /reports/blob/:blobId must be declared BEFORE /reports/:id
 * so Express doesn't interpret "blob" as an `:id` param.
 */
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ─── GET /reports ─────────────────────────────────────────────────────────

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    // Clamp limit to prevent abuse
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);

    return this.reportService.findAll({ page: safePage, limit: safeLimit, status });
  }

  // ─── GET /reports/blob/:blobId ────────────────────────────────────────────
  // Must be before /:id to avoid route collision

  @Get('blob/:blobId')
  async findByBlobId(@Param('blobId') blobId: string) {
    return this.reportService.findByBlobId(blobId);
  }

  // ─── GET /reports/:id ─────────────────────────────────────────────────────

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reportService.findById(id);
  }
}
