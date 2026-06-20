import { Controller, Post, Get, Param, Query, Body, UseGuards, Sse, Header, NotFoundException, ForbiddenException, ParseUUIDPipe } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Observable, of } from 'rxjs';
import Redis from 'ioredis';
import { REPO_AUDIT_QUEUE } from '../../common/constants/queue.constants.js';
import { FlexibleAuthGuard } from '../../common/guards/flexible-auth.guard.js';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { GitHubService } from '../github/github.service.js';
import { RepoAuditService } from './repo-audit.service.js';
import { RepoAuditGateway } from './repo-audit.gateway.js';
import { SubscriptionService } from '../subscription/subscription.service.js';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#2563eb',
  INFO: '#16a34a',
  NONE: '#16a34a',
};

function buildBadgeSvg(audit: { overallRisk: string | null; totalFindings: number; blobId: string | null } | null): string {
  const label = 'sui audit';
  const risk = audit?.overallRisk ?? null;
  const value = risk ? `${risk} · ${audit!.totalFindings} finding${audit!.totalFindings !== 1 ? 's' : ''}` : 'not audited';
  const color = risk ? (RISK_COLORS[risk] ?? '#6b7280') : '#6b7280';

  const labelW = label.length * 6.5 + 20;
  const valueW = value.length * 6.5 + 20;
  const totalW = labelW + valueW;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalW}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#555"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="${color}"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text x="${Math.round(labelW / 2) * 10 + 1}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelW - 10) * 10}" lengthAdjust="spacing">${label}</text>
    <text x="${Math.round(labelW / 2) * 10}" y="140" transform="scale(.1)" textLength="${(labelW - 10) * 10}" lengthAdjust="spacing">${label}</text>
    <text x="${(labelW + Math.round(valueW / 2)) * 10 + 1}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(valueW - 10) * 10}" lengthAdjust="spacing">${value}</text>
    <text x="${(labelW + Math.round(valueW / 2)) * 10}" y="140" transform="scale(.1)" textLength="${(valueW - 10) * 10}" lengthAdjust="spacing">${value}</text>
  </g>
</svg>`;
}

@Controller('repo-audit')
export class RepoAuditController {
  private readonly redis: Redis;

  constructor(
    @InjectQueue(REPO_AUDIT_QUEUE) private readonly repoAuditQueue: Queue,
    private readonly githubService: GitHubService,
    private readonly repoAuditService: RepoAuditService,
    private readonly repoAuditGateway: RepoAuditGateway,
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    this.redis = new Redis({ host, port });
  }

  @Post('scan')
  async scan(@Body() body: { repoUrl: string; includeTests?: boolean }) {
    const repoInfo = await this.githubService.scanRepository(body.repoUrl, body.includeTests || false);
    
    const scanId = crypto.randomBytes(16).toString('hex');
    await this.redis.set(`scan:${scanId}`, JSON.stringify(repoInfo), 'EX', 600); // 10 min TTL

    return {
      scanId,
      repoOwner: repoInfo.owner,
      repoName: repoInfo.name,
      commitSha: repoInfo.commitSha,
      moveFiles: repoInfo.moveFiles.map((f) => ({
        path: f.path,
        name: f.name,
        size: f.size,
      })),
      estimatedAudits: repoInfo.moveFiles.length,
    };
  }

  @Post('submit')
  @UseGuards(FlexibleAuthGuard, RateLimitGuard)
  async submit(@CurrentUser() user: any, @Body() body: { scanId: string; projectTrack: string; includeTests?: boolean; txDigest?: string }) {
    const cached = await this.redis.get(`scan:${body.scanId}`);
    if (!cached) {
      throw new NotFoundException('Scan expired or not found. Please scan the repository again.');
    }

    const repoInfo = JSON.parse(cached);
    const filesCount = repoInfo.moveFiles.length;

    const userId: string | undefined = user?.userId || user?.sub || user?.id;
    const walletPaid = !!body.txDigest;

    // Enforce audit quota only for authenticated (credit-based) users
    if (!walletPaid && userId) {
      const allowed = await this.subscriptionService.checkAndIncrementUsage(userId, filesCount);
      if (!allowed) {
        throw new ForbiddenException('Insufficient audit credits for this repository.');
      }
    }

    // Create RepoAudit record
    const repoAudit = await this.repoAuditService.createRepoAudit({
      userId,
      repoUrl: `https://github.com/${repoInfo.owner}/${repoInfo.name}`,
      repoOwner: repoInfo.owner,
      repoName: repoInfo.name,
      repoDefaultBranch: repoInfo.defaultBranch,
      commitSha: repoInfo.commitSha,
      projectTrack: body.projectTrack,
      contractsFound: filesCount,
    });

    // Enqueue job
    await this.repoAuditQueue.add('process-repo', {
      repoAuditId: repoAudit.id,
      repoUrl: `https://github.com/${repoInfo.owner}/${repoInfo.name}`,
      repoOwner: repoInfo.owner,
      repoName: repoInfo.name,
      defaultBranch: repoInfo.defaultBranch,
      projectTrack: body.projectTrack,
      moveFiles: repoInfo.moveFiles,
      userId,
    });

    // Clear scan cache
    await this.redis.del(`scan:${body.scanId}`);

    return {
      repoAuditId: repoAudit.id,
      statusUrl: `/repo-audit/${repoAudit.id}/status`,
      reportUrl: `/repo-audit/${repoAudit.id}/report`,
    };
  }

  @Sse(':id/status')
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  @Header('Connection', 'keep-alive')
  async statusStream(@Param('id', ParseUUIDPipe) id: string): Promise<Observable<MessageEvent>> {
    const repoAudit = await this.repoAuditService.findById(id);
    if (!repoAudit) {
      throw new NotFoundException(`Repo audit "${id}" not found`);
    }

    if (repoAudit.status === 'COMPLETE' && repoAudit.blobId && repoAudit.walrusUrl) {
      return of({
        data: JSON.stringify({
          type: 'complete',
          blobId: repoAudit.blobId,
          walrusUrl: repoAudit.walrusUrl,
          onChainTxDigest: repoAudit.onChainTxDigest,
        }),
        type: 'complete',
      } as MessageEvent);
    }

    if (repoAudit.status === 'FAILED') {
      return of({
        data: JSON.stringify({
          type: 'error',
          message: repoAudit.errorMessage || 'Repo audit failed',
        }),
        type: 'error',
      } as MessageEvent);
    }

    return this.repoAuditGateway.getEventStream(id) as any;
  }

  @Get('blob/:blobId')
  async getByBlobId(@Param('blobId') blobId: string) {
    const repoAudit = await this.repoAuditService.findByBlobId(blobId);
    if (!repoAudit) {
      throw new NotFoundException(`Repo audit with blobId "${blobId}" not found`);
    }
    const crossJson = repoAudit.crossContractJson as any;
    // Shape it like the frontend expects: similar to single audit but with repo fields
    return {
      ...repoAudit,
      findingsJson: {
        summary: {
          executiveSummary: crossJson?.executiveSummary || '',
          overallRisk: repoAudit.overallRisk,
        },
        sharedRisks: crossJson?.sharedRisks || [],
        systemicPatterns: crossJson?.systemicPatterns || [],
        missingSystemFeatures: crossJson?.missingSystemFeatures || [],
        perContractFindings: repoAudit.contractAudits.map(ca => ({
          fileName: ca.fileName,
          overallRisk: ca.overallRisk,
          contractHash: ca.contractHash,
          findings: Array.isArray(ca.findingsJson) ? ca.findingsJson : [],
        })),
      }
    };
  }

  @Get(':id/report')
  async getReport(@Param('id', ParseUUIDPipe) id: string) {
    const repoAudit = await this.repoAuditService.findById(id);
    if (!repoAudit) {
      throw new NotFoundException(`Repo audit "${id}" not found`);
    }
    return repoAudit;
  }

  @Get('badge/:owner/:repo')
  @Header('Content-Type', 'image/svg+xml')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  @Header('Access-Control-Allow-Origin', '*')
  async getBadge(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
  ): Promise<string> {
    const audit = await this.repoAuditService.findLatestCompleteByRepo(owner, repo);
    return buildBadgeSvg(audit);
  }

  @Get('')
  @UseGuards(FlexibleAuthGuard)
  async list(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const userId = user?.sub || user?.id;
    return this.repoAuditService.findByUserId(userId, page, limit);
  }
}
