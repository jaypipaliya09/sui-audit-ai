import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { AUDIT_QUEUE } from '../../common/constants/queue.constants.js';
import { ClaudeService } from '../claude/claude.service.js';
import { WalrusService } from '../walrus/walrus.service.js';
import { ReportService } from '../report/report.service.js';
import { AuditRepository } from './audit.repository.js';
import { AuditGateway } from './audit.gateway.js';
import type { AuditJobData } from '../claude/types/finding.types.js';

// String constants matching Prisma AuditStatus enum values
const AuditStatus = {
  QUEUED: 'QUEUED',
  ANALYZING: 'ANALYZING',
  STORING: 'STORING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
} as const;

@Processor(AUDIT_QUEUE)
export class AuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(
    private readonly claudeService: ClaudeService,
    private readonly walrusService: WalrusService,
    @Inject(forwardRef(() => ReportService))
    private readonly reportService: ReportService,
    private readonly auditRepository: AuditRepository,
    private readonly auditGateway: AuditGateway,
  ) {
    super();
  }

  async process(job: Job<AuditJobData>): Promise<void> {
    const { auditId, contractCode, contractName, track } = job.data;

    this.logger.log(
      `Processing job [${job.id}] → audit [${auditId}] for "${contractName}" (Track: ${track || 'General'})`,
    );

    try {
      // ── Phase 1: Mark as ANALYZING ────────────────────────────────────────
      await this.auditRepository.updateStatus(auditId, AuditStatus.ANALYZING);
      this.auditGateway.emitProgress(auditId, 10, 'Parsing contract structure...');

      // ── Phase 2: Claude AI Analysis ───────────────────────────────────────
      const result = await this.claudeService.auditContract(
        contractCode,
        contractName,
        track,
        (pct: number, msg: string) => {
          // Claude fires at 25% and 65% — map these into our 20-70% band
          const mappedPct = Math.round(20 + (pct / 100) * 50);
          this.auditGateway.emitProgress(auditId, mappedPct, msg);
        },
      );

      // ── Phase 3: Generate HTML Report ────────────────────────────────────
      this.auditGateway.emitProgress(auditId, 75, 'Generating HTML report...');
      const html = this.reportService.generateHtml(result, contractName);

      // ── Phase 4: Upload to Walrus ─────────────────────────────────────────
      await this.auditRepository.updateStatus(auditId, AuditStatus.STORING);
      this.auditGateway.emitProgress(auditId, 85, 'Uploading to Walrus network...');
      const blobId = await this.walrusService.storeReport(html);
      const walrusUrl = this.walrusService.getReportUrl(blobId);

      // ── Phase 5: Persist Result to DB ─────────────────────────────────────
      this.auditGateway.emitProgress(auditId, 95, 'Saving results...');
      await this.auditRepository.saveResult({ auditId, result, blobId, walrusUrl });

      // ── Phase 6: Done! ───────────────────────────────────────────────────
      this.auditGateway.emitProgress(auditId, 100, 'Audit complete!');
      this.auditGateway.emitComplete(auditId, blobId, walrusUrl);

      this.logger.log(
        `✅ Audit [${auditId}] finished — blobId: ${blobId}, risk: ${result.summary.overallRisk}`,
      );
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : 'Unknown worker error';

      this.logger.error(`❌ Audit [${auditId}] failed: ${errMsg}`);

      await this.auditRepository.markFailed(auditId, errMsg).catch((dbErr) => {
        this.logger.error(`Failed to mark audit as FAILED in DB: ${dbErr}`);
      });

      this.auditGateway.emitError(auditId, errMsg);

      // Re-throw so BullMQ can apply retry logic
      throw error;
    }
  }
}
