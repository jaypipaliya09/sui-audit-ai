import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { $Enums, Prisma } from '@prisma/client';

@Injectable()
export class RepoAuditService {
  private readonly logger = new Logger(RepoAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createRepoAudit(data: {
    userId: string;
    repoUrl: string;
    repoOwner: string;
    repoName: string;
    repoDefaultBranch: string;
    commitSha: string;
    projectTrack: string;
    contractsFound: number;
  }) {
    return this.prisma.repoAudit.create({
      data: {
        userId: data.userId,
        repoUrl: data.repoUrl,
        repoOwner: data.repoOwner,
        repoName: data.repoName,
        repoDefaultBranch: data.repoDefaultBranch,
        commitSha: data.commitSha,
        projectTrack: data.projectTrack as any,
        contractsFound: data.contractsFound,
        status: 'SCANNING',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.repoAudit.findUnique({
      where: { id },
      include: { contractAudits: true },
    });
  }

  async findByUserId(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.repoAudit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          repoOwner: true,
          repoName: true,
          projectTrack: true,
          status: true,
          contractsFound: true,
          contractsAudited: true,
          overallRisk: true,
          totalFindings: true,
          criticalCount: true,
          highCount: true,
          mediumCount: true,
          lowCount: true,
          infoCount: true,
          blobId: true,
          walrusUrl: true,
        },
      }),
      this.prisma.repoAudit.count({ where: { userId } }),
    ]);
    return { data, total };
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.repoAudit.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async createContractAudit(data: {
    repoAuditId: string;
    filePath: string;
    fileName: string;
    fileContent: string;
    lineCount: number;
  }) {
    return this.prisma.contractAudit.create({ data: data as any });
  }

  async saveContractResult(contractAuditId: string, result: any) {
    const findings = result.findings || [];
    return this.prisma.contractAudit.update({
      where: { id: contractAuditId },
      data: {
        status: 'COMPLETE',
        overallRisk: result.summary?.overallRisk as any,
        findingsJson: JSON.parse(JSON.stringify(findings)),
        criticalCount: findings.filter((f: any) => f.severity === 'CRITICAL').length,
        highCount: findings.filter((f: any) => f.severity === 'HIGH').length,
        mediumCount: findings.filter((f: any) => f.severity === 'MEDIUM').length,
        lowCount: findings.filter((f: any) => f.severity === 'LOW').length,
        infoCount: findings.filter((f: any) => f.severity === 'INFO').length,
      },
    });
  }

  async markContractFailed(contractAuditId: string, errorMessage: string) {
    return this.prisma.contractAudit.update({
      where: { id: contractAuditId },
      data: { status: 'FAILED', errorMessage },
    });
  }

  async saveRepoResult(repoAuditId: string, data: {
    overallRisk: string;
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    contractsAudited: number;
    blobId?: string;
    walrusUrl?: string;
    onChainTxDigest?: string;
    crossContractJson?: any;
  }) {
    return this.prisma.repoAudit.update({
      where: { id: repoAuditId },
      data: {
        status: 'COMPLETE',
        overallRisk: data.overallRisk as any,
        totalFindings: data.totalFindings,
        criticalCount: data.criticalCount,
        highCount: data.highCount,
        mediumCount: data.mediumCount,
        lowCount: data.lowCount,
        infoCount: data.infoCount,
        contractsAudited: data.contractsAudited,
        blobId: data.blobId,
        walrusUrl: data.walrusUrl,
        onChainTxDigest: data.onChainTxDigest,
        crossContractJson: data.crossContractJson ? JSON.parse(JSON.stringify(data.crossContractJson)) : undefined,
      },
    });
  }

  async markFailed(repoAuditId: string, errorMessage: string) {
    return this.prisma.repoAudit.update({
      where: { id: repoAuditId },
      data: { status: 'FAILED', errorMessage },
    });
  }
}
