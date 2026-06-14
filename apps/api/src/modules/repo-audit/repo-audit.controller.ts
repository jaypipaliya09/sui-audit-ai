import { Controller, Post, Get, Param, Query, Body, UseGuards, Sse, Header, NotFoundException } from '@nestjs/common';
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
import { BillingService } from '../billing/billing.service.js';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('repo-audit')
export class RepoAuditController {
  private readonly redis: Redis;

  constructor(
    @InjectQueue(REPO_AUDIT_QUEUE) private readonly repoAuditQueue: Queue,
    private readonly githubService: GitHubService,
    private readonly repoAuditService: RepoAuditService,
    private readonly repoAuditGateway: RepoAuditGateway,
    private readonly billingService: BillingService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    this.redis = new Redis({ host, port });
  }

  @Post('scan')
  @UseGuards(FlexibleAuthGuard)
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
  async submit(@CurrentUser() user: any, @Body() body: { scanId: string; projectTrack: string; includeTests?: boolean }) {
    const cached = await this.redis.get(`scan:${body.scanId}`);
    if (!cached) {
      throw new NotFoundException('Scan expired or not found. Please scan the repository again.');
    }

    const repoInfo = JSON.parse(cached);
    const filesCount = repoInfo.moveFiles.length;

    // Check quota
    const allowed = await this.billingService.checkAndIncrementUsage(user.userId, filesCount);
    if (!allowed) {
      throw new NotFoundException('Insufficient audit credits. Please upgrade your plan.');
    }

    // Create RepoAudit record
    const repoAudit = await this.repoAuditService.createRepoAudit({
      userId: user.userId,
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
      userId: user.userId,
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
  async statusStream(@Param('id') id: string): Promise<Observable<MessageEvent>> {
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

  @Get(':id/report')
  async getReport(@Param('id') id: string) {
    const repoAudit = await this.repoAuditService.findById(id);
    if (!repoAudit) {
      throw new NotFoundException(`Repo audit "${id}" not found`);
    }
    return repoAudit;
  }

  @Get('')
  @UseGuards(FlexibleAuthGuard)
  async list(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.repoAuditService.findByUserId(user.userId, page, limit);
  }
}
