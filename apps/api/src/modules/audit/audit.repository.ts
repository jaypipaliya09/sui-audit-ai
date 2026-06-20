import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuditResult } from '../claude/types/finding.types.js';
import { $Enums } from '@prisma/client';
const AuditStatus = {
  QUEUED: 'QUEUED',
  ANALYZING: 'ANALYZING',
  STORING: 'STORING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
} as const;
type AuditStatus = typeof AuditStatus[keyof typeof AuditStatus];

export interface SaveResultPayload {
  auditId: string;
  result: AuditResult;
  blobId: string;
  walrusUrl: string;
}

@Injectable()
export class AuditRepository {
  private readonly logger = new Logger(AuditRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ──────────────────────────────────────────────────────────────────

  async createAudit(contractName: string, contractCode: string, txDigest?: string, walletAddress?: string) {
    const audit = await this.prisma.audit.create({
      data: {
        contractName,
        contractCode,
        status: AuditStatus.QUEUED,
        ...(txDigest && { txDigest }),
        ...(walletAddress && { walletAddress: walletAddress.toLowerCase() }),
      },
    });
    this.logger.log(`Created audit record [${audit.id}] for "${contractName}"${txDigest ? ` with payment ${txDigest}` : ''}`);
    return audit;
  }

  async findByWallet(walletAddress: string) {
    return this.prisma.audit.findMany({
      where: { walletAddress: walletAddress.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        contractName: true,
        overallRisk: true,
        blobId: true,
        createdAt: true,
        status: true,
      },
    });
  }

  // ─── Read ────────────────────────────────────────────────────────────────────

  async findByTxDigest(txDigest: string) {
    return this.prisma.audit.findUnique({ where: { txDigest } });
  }

  async findById(id: string) {
    return this.prisma.audit.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id } });
    if (!audit) {
      throw new NotFoundException(`Audit with id "${id}" not found`);
    }
    return audit;
  }

  async findByBlobId(blobId: string) {
    return this.prisma.audit.findFirst({ where: { blobId } });
  }

  async findByHash(contractHash: string) {
    return this.prisma.audit.findFirst({
      where: { contractHash, status: 'COMPLETE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(params: { page: number; limit: number; status?: AuditStatus }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.audit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        // Omit contractCode for list view (can be large)
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          contractName: true,
          status: true,
          blobId: true,
          walrusUrl: true,
          overallRisk: true,
          criticalCount: true,
          highCount: true,
          mediumCount: true,
          lowCount: true,
          infoCount: true,
          errorMessage: true,
          summaryJson: true,
        },
      }),
      this.prisma.audit.count({ where }),
    ]);

    return { data, total };
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async updateStatus(auditId: string, status: AuditStatus, errorMessage?: string) {
    return this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status,
        ...(errorMessage !== undefined && { errorMessage }),
      },
    });
  }

  async saveResult({ auditId, result, blobId, walrusUrl }: SaveResultPayload) {
    const { findings, summary, gasAnalysis, overallRecommendations } = result;

    // Tally findings per severity
    const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
    const highCount = findings.filter((f) => f.severity === 'HIGH').length;
    const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;
    const lowCount = findings.filter((f) => f.severity === 'LOW').length;
    const infoCount = findings.filter((f) => f.severity === 'INFO').length;

    const updated = await this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status: AuditStatus.COMPLETE,
        blobId,
        walrusUrl,
        overallRisk: summary.overallRisk as $Enums.RiskLevel,
        findingsJson: JSON.parse(JSON.stringify(findings)), // ensure plain object for Prisma Json
        summaryJson: JSON.parse(JSON.stringify({ ...summary, gasAnalysis, overallRecommendations })),
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        infoCount,
        errorMessage: null,
      },
    });

    this.logger.log(
      `Saved audit result [${auditId}] — blobId: ${blobId}, risk: ${summary.overallRisk}`,
    );

    return updated;
  }

  async markFailed(auditId: string, errorMessage: string) {
    return this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status: AuditStatus.FAILED,
        errorMessage,
      },
    });
  }

  async resetAuditStatus(auditId: string, contractName: string, contractCode: string) {
    return this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status: AuditStatus.QUEUED,
        errorMessage: null,
        contractName,
        contractCode,
      },
    });
  }

  async updateOnChain(auditId: string, txDigest: string) {
    return this.prisma.audit.update({
      where: { id: auditId },
      data: {
        onChainTxDigest: txDigest,
        onChainAnchoredAt: new Date(),
      },
    });
  }

  // ─── Clone (Deduplication) ───────────────────────────────────────────────────

  async cloneAudit(originalAuditId: string, newAuditId: string, userId: string | undefined) {
    const original = await this.findByIdOrThrow(originalAuditId);
    
    const cloned = await this.prisma.audit.update({
      where: { id: newAuditId },
      data: {
        status: 'COMPLETE',
        overallRisk: original.overallRisk,
        findingsJson: original.findingsJson ?? undefined,
        summaryJson: original.summaryJson ?? undefined,
        blobId: original.blobId,
        walrusUrl: original.walrusUrl,
        criticalCount: original.criticalCount,
        highCount: original.highCount,
        mediumCount: original.mediumCount,
        lowCount: original.lowCount,
        infoCount: original.infoCount,
        contractHash: original.contractHash,
        // Guard against empty-string / missing userId violating the FK.
        userId: userId || undefined,
      },
    });

    this.logger.log(`Cloned findings from audit [${originalAuditId}] to new audit [${newAuditId}]`);
    return cloned;
  }
}
