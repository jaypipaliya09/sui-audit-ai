import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Sse,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Observable, of } from 'rxjs';
import { AuditService } from './audit.service.js';
import { AuditGateway } from './audit.gateway.js';
import { AuditRepository } from './audit.repository.js';
import { SubmitAuditDto } from './dto/submit-audit.dto.js';

// String constants matching Prisma AuditStatus enum values
const AuditStatus = {
  QUEUED: 'QUEUED',
  ANALYZING: 'ANALYZING',
  STORING: 'STORING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
} as const;

@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly auditGateway: AuditGateway,
    private readonly auditRepository: AuditRepository,
  ) {}

  // ─── POST /audit/submit ───────────────────────────────────────────────────
  // Rate-limited: 20 submissions per IP per hour

  @Post('submit')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 20, ttl: 3600_000 } })
  async submit(@Body() dto: SubmitAuditDto) {
    const { auditId } = await this.auditService.submitAudit(dto);
    return {
      auditId,
      statusUrl: `/audit/${auditId}/status`,
      reportUrl: `/audit/${auditId}/report`,
      message: 'Audit queued successfully',
    };
  }

  // ─── GET /audit/:id/status (SSE) ─────────────────────────────────────────
  // No rate limit on SSE — clients need to reconnect freely

  @SkipThrottle()
  @Sse(':id/status')
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  @Header('Connection', 'keep-alive')
  async statusStream(@Param('id') id: string): Promise<Observable<MessageEvent>> {
    const audit = await this.auditRepository.findById(id);

    if (!audit) {
      throw new NotFoundException(`Audit "${id}" not found`);
    }

    // If already complete, immediately emit the complete event and close
    if (audit.status === AuditStatus.COMPLETE && audit.blobId && audit.walrusUrl) {
      const completeMessage = {
        data: JSON.stringify({
          type: 'complete',
          blobId: audit.blobId,
          walrusUrl: audit.walrusUrl,
          auditId: id,
        }),
        type: 'complete',
      } as MessageEvent;

      return of(completeMessage);
    }

    // If already failed, immediately emit error and close
    if (audit.status === AuditStatus.FAILED) {
      const errorMessage = {
        data: JSON.stringify({
          type: 'error',
          errorMessage: audit.errorMessage || 'Audit failed',
          auditId: id,
        }),
        type: 'error',
      } as MessageEvent;

      return of(errorMessage);
    }

    // Otherwise stream live events from the gateway
    return this.auditGateway.getEventStream(id);
  }

  // ─── GET /audit/:id/report ────────────────────────────────────────────────

  @Get(':id/report')
  async getReport(@Param('id') id: string) {
    const audit = await this.auditRepository.findById(id);
    if (!audit) {
      throw new NotFoundException(`Audit "${id}" not found`);
    }
    return audit;
  }
}
