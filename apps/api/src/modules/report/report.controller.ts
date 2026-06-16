import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { ReportService } from './report.service.js';
import { WalrusService } from '../walrus/walrus.service.js';

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
@Controller()
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly walrusService: WalrusService,
  ) {}

  // ─── GET /reports/pdf/:blobId ─────────────────────────────────────────────
  // Proxy a Walrus blob and serve it as a real PDF so browsers render it
  // (the Walrus aggregator serves blobs as application/json).
  @SkipThrottle()
  @Get('reports/pdf/:blobId')
  async getPdf(@Param('blobId') blobId: string, @Res() res: Response) {
    try {
      const pdf = await this.walrusService.fetchBlob(blobId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="audit-${blobId.slice(0, 8)}.pdf"`);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(pdf);
    } catch {
      return res.status(404).send('Report not found');
    }
  }

  // ─── GET /reports ─────────────────────────────────────────────────────────

  @Get('reports')
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
  // Must be before /reports/:id to avoid route collision

  @Get('reports/blob/:blobId')
  async findByBlobId(@Param('blobId') blobId: string) {
    return this.reportService.findByBlobId(blobId);
  }

  // ─── GET /reports/:id ─────────────────────────────────────────────────────

  @Get('reports/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportService.findById(id);
  }

  // ─── GET /badge/:blobId ───────────────────────────────────────────────────

  @Get('badge/:blobId')
  async getBadge(@Param('blobId') blobId: string, @Res() res: Response) {
    const report = await this.reportService.findByBlobId(blobId);
    if (!report) {
      return res.status(404).send('Not Found');
    }

    const risk = report.overallRisk || 'MEDIUM';
    const colors: Record<string, string> = {
      CLEAN: '#16a34a',
      LOW: '#84cc16',
      MEDIUM: '#ca8a04',
      HIGH: '#dc2626',
      CRITICAL: '#7f1d1d',
    };
    const color = colors[risk] || colors.MEDIUM;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20" role="img" aria-label="MoveAuditor: ${risk}">
      <title>MoveAuditor: ${risk}</title>
      <linearGradient id="s" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
      </linearGradient>
      <clipPath id="r">
        <rect width="200" height="20" rx="3" fill="#fff"/>
      </clipPath>
      <g clip-path="url(#r)">
        <rect width="120" height="20" fill="#555"/>
        <rect x="120" width="80" height="20" fill="${color}"/>
        <rect width="200" height="20" fill="url(#s)"/>
      </g>
      <g fill="#fff" text-anchor="middle" font-family="Courier New, monospace" font-size="11" font-weight="bold" text-rendering="geometricPrecision">
        <text x="60" y="14">MoveAuditor</text>
        <text x="160" y="14">${risk}</text>
      </g>
    </svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'max-age=86400');
    return res.status(200).send(svg);
  }
}
