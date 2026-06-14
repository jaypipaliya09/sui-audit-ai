import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { AUDIT_QUEUE } from '../../common/constants/queue.constants.js';
import { ClaudeService } from '../claude/claude.service.js';
import { WalrusService } from '../walrus/walrus.service.js';
import { ReportService } from '../report/report.service.js';
import { AuditRepository } from './audit.repository.js';
import { AuditGateway } from './audit.gateway.js';
import { OnChainRegistryService } from '../on-chain/on-chain-registry.service.js';
import { EmailService } from '../email/email.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
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
    private readonly onChainRegistryService: OnChainRegistryService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<AuditJobData>): Promise<void> {
    const { auditId, contractCode, contractName, userId } = job.data;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    this.logger.log(
      `Processing job [${job.id}] → audit [${auditId}] for "${contractName}"`,
    );

    try {
      // ── Phase 1: Mark as ANALYZING ────────────────────────────────────────
      await this.auditRepository.updateStatus(auditId, AuditStatus.ANALYZING);
      this.auditGateway.emitProgress(auditId, 10, 'Parsing contract structure...');

      // ── Phase 2: Claude AI Analysis ───────────────────────────────────────
      const result = await this.claudeService.auditContract(
        contractCode,
        contractName,
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
      this.auditGateway.emitProgress(auditId, 88, 'Saving results...');
      await this.auditRepository.saveResult({ auditId, result, blobId, walrusUrl });

      // ── Phase 5.5: Anchor on-chain (universal — all plans) ─────────────────
      let onChainTxDigest: string | undefined;
      if (this.onChainRegistryService.isConfigured()) {
        this.auditGateway.emitProgress(auditId, 93, 'Anchoring on Sui blockchain...');
        try {
          const contractHash = require('crypto')
            .createHash('sha256')
            .update(contractCode)
            .digest('hex');
          const riskLevel = this.onChainRegistryService.riskLevelToNumber(
            result.summary.overallRisk || 'MEDIUM',
          );
          onChainTxDigest = await this.onChainRegistryService.anchorAudit(
            contractHash,
            blobId,
            riskLevel,
          );
          if (onChainTxDigest) {
            await this.auditRepository.updateOnChain(auditId, onChainTxDigest);
          }
        } catch (chainErr) {
          this.logger.warn(
            `⚠️  On-chain anchoring failed for audit [${auditId}]: ${chainErr}`,
          );
          // Non-fatal — audit is still valid even without on-chain anchoring
        }
      }

      // ── Phase 6: Done! ───────────────────────────────────────────────────
      this.auditGateway.emitProgress(auditId, 100, 'Audit complete!');
      this.auditGateway.emitComplete(auditId, blobId, walrusUrl);

      this.logger.log(
        `✅ Audit [${auditId}] finished — blobId: ${blobId}, risk: ${result.summary.overallRisk}`,
      );

      if (user?.email) {
        await this.emailService.sendAuditComplete(user.email, {
          contractName,
          riskLevel: result.summary.overallRisk || 'MEDIUM',
          criticalCount: result.findings.filter((f) => f.severity === 'CRITICAL').length,
          highCount: result.findings.filter((f) => f.severity === 'HIGH').length,
          mediumCount: result.findings.filter((f) => f.severity === 'MEDIUM').length,
          reportUrl: `http://localhost:3000/audits/${auditId}/report`,
          walrusUrl,
          onChainUrl: onChainTxDigest ? `https://suiscan.xyz/testnet/tx/${onChainTxDigest}` : undefined,
        });
      }
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : 'Unknown worker error';

      this.logger.error(`❌ Audit [${auditId}] failed: ${errMsg}`);

      await this.auditRepository.markFailed(auditId, errMsg).catch((dbErr) => {
        this.logger.error(`Failed to mark audit as FAILED in DB: ${dbErr}`);
      });

      this.auditGateway.emitError(auditId, errMsg);

      if (user?.email) {
        await this.emailService.sendAuditFailed(user.email, {
          contractName,
          errorMessage: errMsg,
        });
      }

      // Re-throw so BullMQ can apply retry logic
      throw error;
    }
  }
}
