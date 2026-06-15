import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { REPO_AUDIT_QUEUE } from '../../common/constants/queue.constants.js';
import { ClaudeService } from '../claude/claude.service.js';
import { WalrusService } from '../walrus/walrus.service.js';
import { OnChainRegistryService } from '../on-chain/on-chain-registry.service.js';
import { GitHubService } from '../github/github.service.js';
import { RepoAuditService } from './repo-audit.service.js';
import { RepoAuditGateway } from './repo-audit.gateway.js';
import { RepoReportService } from '../report/repo-report.service.js';
import { EmailService } from '../email/email.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as crypto from 'crypto';

const AUDIT_CONCURRENCY = 3;

export interface RepoAuditJobData {
  repoAuditId: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  projectTrack: string;
  moveFiles: { path: string; name: string; downloadUrl: string }[];
  userId: string;
}

@Processor(REPO_AUDIT_QUEUE)
export class RepoAuditProcessor extends WorkerHost {
  private readonly logger = new Logger(RepoAuditProcessor.name);

  constructor(
    private readonly claudeService: ClaudeService,
    private readonly walrusService: WalrusService,
    private readonly onChainRegistryService: OnChainRegistryService,
    private readonly githubService: GitHubService,
    private readonly repoAuditService: RepoAuditService,
    private readonly repoAuditGateway: RepoAuditGateway,
    private readonly repoReportService: RepoReportService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<RepoAuditJobData>): Promise<void> {
    const { repoAuditId, repoUrl, repoOwner, repoName, projectTrack, moveFiles, userId } = job.data;
    
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    this.logger.log(`Processing repo audit [${repoAuditId}] for ${repoOwner}/${repoName}`);

    try {
      // ── PHASE 1 (5%): Fetch all Move files ────────────────────────────
      this.repoAuditGateway.emitProgress(repoAuditId, 5, 'Fetching Move files from GitHub...', {
        filesTotal: moveFiles.length,
      });
      await this.repoAuditService.updateStatus(repoAuditId, 'AUDITING');

      const fileContents = await this.githubService.fetchAllMoveFiles(moveFiles as any);

      // Create ContractAudit records
      const contractAudits: { id: string; fileName: string; filePath: string; content: string; contractHash: string }[] = [];
      for (const { file, content } of fileContents) {
        const contractHash = crypto.createHash('sha256').update(content).digest('hex');
        const ca = await this.repoAuditService.createContractAudit({
          repoAuditId,
          filePath: file.path,
          fileName: file.name,
          fileContent: content,
          lineCount: content.split('\n').length,
          contractHash,
        });
        contractAudits.push({ id: ca.id, fileName: file.name, filePath: file.path, content, contractHash });
      }

      // ── PHASE 2 (10-80%): Audit each contract ────────────────────────
      const auditResults: { fileName: string; findings: any[]; summary: any; result: any }[] = [];
      let filesAudited = 0;

      // Process in batches of AUDIT_CONCURRENCY
      for (let i = 0; i < contractAudits.length; i += AUDIT_CONCURRENCY) {
        const batch = contractAudits.slice(i, i + AUDIT_CONCURRENCY);
        await Promise.all(
          batch.map(async (ca) => {
            try {
              const pctBase = 10 + ((filesAudited / contractAudits.length) * 70);
              this.repoAuditGateway.emitProgress(repoAuditId, Math.round(pctBase), `Auditing ${ca.fileName}...`, {
                currentFile: ca.fileName,
                filesAudited,
                filesTotal: contractAudits.length,
              });

              const result = await this.claudeService.auditContract(
                ca.content,
                ca.fileName,
                undefined,
                projectTrack,
              );

              await this.repoAuditService.saveContractResult(ca.id, result);

              this.repoAuditGateway.emitFileComplete(
                repoAuditId,
                ca.fileName,
                result.summary?.overallRisk || 'UNKNOWN',
                result.findings?.length || 0,
              );

              auditResults.push({
                fileName: ca.fileName,
                findings: result.findings || [],
                summary: result.summary,
                result,
              });
            } catch (err) {
              this.logger.error(`Failed to audit ${ca.fileName}: ${err}`);
              await this.repoAuditService.markContractFailed(ca.id, String(err));
              auditResults.push({
                fileName: ca.fileName,
                findings: [],
                summary: { overallRisk: 'UNKNOWN' },
                result: null,
              });
            }
            filesAudited++;
          }),
        );
      }

      // ── PHASE 3 (82%): Cross-contract analysis ───────────────────────
      this.repoAuditGateway.emitProgress(repoAuditId, 82, 'Analyzing cross-contract risks...');
      await this.repoAuditService.updateStatus(repoAuditId, 'AGGREGATING');

      const crossContractAnalysis = await this.claudeService.analyzeCrossContract(
        auditResults,
        projectTrack,
      );

      // ── PHASE 4 (88%): Generate consolidated HTML report ──────────────
      this.repoAuditGateway.emitProgress(repoAuditId, 88, 'Generating consolidated report...');

      const html = this.repoReportService.generateConsolidatedHtml({
        repoOwner,
        repoName,
        commitSha: job.data.defaultBranch,
        projectTrack,
        auditResults,
        crossContractAnalysis,
      });

      // ── PHASE 5 (94%): Upload to Walrus ──────────────────────────────
      this.repoAuditGateway.emitProgress(repoAuditId, 94, 'Uploading to Walrus network...');
      await this.repoAuditService.updateStatus(repoAuditId, 'STORING');

      const blobId = await this.walrusService.storeReport(html);
      const walrusUrl = this.walrusService.getReportUrl(blobId);

      // ── PHASE 6 (100%): On-chain anchor + save result ─────────────────
      let onChainTxDigest: string | undefined;
      if (this.onChainRegistryService.isConfigured()) {
        try {
          const repoHash = crypto.createHash('sha256')
            .update(`${repoOwner}/${repoName}`)
            .digest('hex');
          const riskLevel = this.onChainRegistryService.riskLevelToNumber(
            crossContractAnalysis.repositoryRisk || 'MEDIUM',
          );
          onChainTxDigest = await this.onChainRegistryService.anchorAudit(repoHash, blobId, riskLevel);
        } catch (chainErr) {
          this.logger.warn(`On-chain anchoring failed for repo audit: ${chainErr}`);
        }
      }

      // Aggregate counts
      const allFindings = auditResults.flatMap((r) => r.findings);
      const totalFindings = allFindings.length;
      const criticalCount = allFindings.filter((f) => f.severity === 'CRITICAL').length;
      const highCount = allFindings.filter((f) => f.severity === 'HIGH').length;
      const mediumCount = allFindings.filter((f) => f.severity === 'MEDIUM').length;
      const lowCount = allFindings.filter((f) => f.severity === 'LOW').length;
      const infoCount = allFindings.filter((f) => f.severity === 'INFO').length;

      await this.repoAuditService.saveRepoResult(repoAuditId, {
        overallRisk: crossContractAnalysis.repositoryRisk || 'MEDIUM',
        totalFindings,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        infoCount,
        contractsAudited: filesAudited,
        blobId,
        walrusUrl,
        onChainTxDigest,
        crossContractJson: crossContractAnalysis,
      });

      this.repoAuditGateway.emitProgress(repoAuditId, 100, 'Repository audit complete!');
      this.repoAuditGateway.emitComplete(repoAuditId, blobId, walrusUrl, onChainTxDigest);

      this.logger.log(`✅ Repo audit [${repoAuditId}] complete — ${filesAudited} contracts audited`);

      if (user?.email) {
        await this.emailService.sendRepoAuditComplete(user.email, {
          repoName: `${repoOwner}/${repoName}`,
          riskLevel: crossContractAnalysis.repositoryRisk || 'MEDIUM',
          contractsAudited: filesAudited,
          totalFindings,
          reportUrl: `http://localhost:3000/repo-audit/${repoAuditId}/report`,
          walrusUrl,
        });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Repo audit [${repoAuditId}] failed: ${errMsg}`);
      await this.repoAuditService.markFailed(repoAuditId, errMsg);
      this.repoAuditGateway.emitError(repoAuditId, errMsg);
      
      if (user?.email) {
        await this.emailService.sendAuditFailed(user.email, {
          contractName: `${repoOwner}/${repoName} (Repository)`,
          errorMessage: errMsg,
        });
      }

      throw error;
    }
  }
}
