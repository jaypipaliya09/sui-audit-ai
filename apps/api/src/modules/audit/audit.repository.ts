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

  async createAudit(contractName: string, contractCode: string, txDigest?: string) {
    const audit = await this.prisma.audit.create({
      data: {
        contractName,
        contractCode,
        status: AuditStatus.QUEUED,
        ...(txDigest && { txDigest }),
      },
    });
    this.logger.log(`Created audit record [${audit.id}] for "${contractName}"${txDigest ? ` with payment ${txDigest}` : ''}`);
    return audit;
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
    return this.prisma.audit.findUnique({ where: { blobId } });
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

  async updateOnChain(auditId: string, txDigest: string) {
    return this.prisma.audit.update({
      where: { id: auditId },
      data: {
        onChainTxDigest: txDigest,
        onChainAnchoredAt: new Date(),
      },
    });
  }
}
