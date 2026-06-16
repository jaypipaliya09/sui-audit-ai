import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AuditRunsService } from './audit-runs.service.js';
import type { CreateAuditRunDto } from './audit-runs.service.js';

@Controller('audit-runs')
export class AuditRunsController {
  constructor(private readonly auditRuns: AuditRunsService) {}

  /** Called by the move-auditor CLI after a run finishes. */
  @Post()
  async create(@Body() body: CreateAuditRunDto) {
    return this.auditRuns.create(body);
  }

  /** Per-user report list for the dashboard, scoped to a Slush wallet. */
  @Get()
  async list(@Query('wallet') wallet: string) {
    if (!wallet) return [];
    return this.auditRuns.listByWallet(wallet);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const run = await this.auditRuns.findOne(id);
    if (!run) throw new NotFoundException('Audit run not found');
    return run;
  }
}
