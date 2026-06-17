import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { REPO_AUDIT_QUEUE } from '../../common/constants/queue.constants.js';
import { RepoAuditController } from './repo-audit.controller.js';
import { RepoAuditService } from './repo-audit.service.js';
import { RepoAuditProcessor } from './repo-audit.processor.js';
import { RepoAuditGateway } from './repo-audit.gateway.js';
import { GitHubModule } from '../github/github.module.js';
import { ClaudeModule } from '../claude/claude.module.js';
import { WalrusModule } from '../walrus/walrus.module.js';
import { OnChainModule } from '../on-chain/on-chain.module.js';
import { SubscriptionModule } from '../subscription/subscription.module.js';
import { ReportModule } from '../report/report.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { RateLimitModule } from '../rate-limiting/rate-limit.module.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: REPO_AUDIT_QUEUE }),
    GitHubModule,
    ClaudeModule,
    WalrusModule,
    OnChainModule,
    SubscriptionModule,
    ReportModule,
    AuthModule,
    RateLimitModule,
  ],
  controllers: [RepoAuditController],
  providers: [RepoAuditService, RepoAuditProcessor, RepoAuditGateway],
  exports: [RepoAuditService],
})
export class RepoAuditModule {}
