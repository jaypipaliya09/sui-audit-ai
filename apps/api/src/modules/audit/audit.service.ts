import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AUDIT_QUEUE, AUDIT_JOB_NAMES, QUEUE_CONFIG } from '../../common/constants/queue.constants.js';
import { AuditRepository } from './audit.repository.js';
import type { SubmitAuditDto } from './dto/submit-audit.dto.js';
import type { AuditJobData } from '../claude/types/finding.types.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectQueue(AUDIT_QUEUE) private readonly auditQueue: Queue,
    private readonly auditRepository: AuditRepository,
  ) {}

  /**
   * Submit a new audit:
   * 1. Create a DB row with status=QUEUED
   * 2. Push a BullMQ job so the worker picks it up
   * 3. Return the auditId for status polling
   */
  async submitAudit(dto: SubmitAuditDto): Promise<{ auditId: string }> {
    const { contractCode, contractName } = dto;

    // 1. Persist audit row
    const audit = await this.auditRepository.createAudit(contractName, contractCode);

    // 2. Queue the job
    const jobData: AuditJobData = {
      auditId: audit.id,
      contractCode,
      contractName,
      submittedAt: new Date(),
    };

    await this.auditQueue.add(
      AUDIT_JOB_NAMES.PROCESS_CONTRACT,
      jobData,
      QUEUE_CONFIG.defaultJobOptions,
    );

    this.logger.log(
      `Audit [${audit.id}] queued for "${contractName}" (${contractCode.split('\n').length} lines)`,
    );

    return { auditId: audit.id };
  }
}
