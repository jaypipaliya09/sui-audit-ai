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
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Observable, of } from 'rxjs';
import { AuditService } from './audit.service.js';
import { AuditGateway } from './audit.gateway.js';
import { AuditRepository } from './audit.repository.js';
import { AuditDiffService } from './audit-diff.service.js';
import { SubmitAuditDto } from './dto/submit-audit.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { FlexibleAuthGuard } from '../../common/guards/flexible-auth.guard.js';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';
import { AuditQuotaGuard } from './guards/audit-quota.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

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
    private readonly auditDiffService: AuditDiffService,
  ) {}

  // ─── POST /audit/submit ───────────────────────────────────────────────────
  // Rate-limited: 20 submissions per IP per hour

  @Post('submit')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 20, ttl: 3600_000 } })
  @UseGuards(FlexibleAuthGuard, RateLimitGuard, AuditQuotaGuard)
  async submit(@Body() dto: SubmitAuditDto, @CurrentUser() user: any) {
    const userId = user?.sub || user?.id;
    const { auditId } = await this.auditService.submitAudit(dto, userId);
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
  async statusStream(@Param('id', ParseUUIDPipe) id: string): Promise<Observable<MessageEvent>> {
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

  // ─── GET /audit/compare ───────────────────────────────────────────────────

  @Get('compare')
  @UseGuards(FlexibleAuthGuard)
  async compare(
    @Query('previous', ParseUUIDPipe) previousId: string,
    @Query('current', ParseUUIDPipe) currentId: string,
  ) {
    return this.auditDiffService.compareAudits(previousId, currentId);
  }

  // ─── GET /audit/:id/report ────────────────────────────────────────────────

  @Get(':id/report')
  async getReport(@Param('id', ParseUUIDPipe) id: string) {
    const audit = await this.auditRepository.findById(id);
    if (!audit) {
      throw new NotFoundException(`Audit "${id}" not found`);
    }
    return audit;
  }
}
