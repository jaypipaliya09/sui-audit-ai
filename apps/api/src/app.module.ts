import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ClaudeModule } from './modules/claude/claude.module.js';
import { WalrusModule } from './modules/walrus/walrus.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { HealthController } from './modules/health/health.controller.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { ApiKeysModule } from './modules/api-keys/api-keys.module.js';
import { RateLimitModule } from './modules/rate-limiting/rate-limit.module.js';
import { OnChainModule } from './modules/on-chain/on-chain.module.js';
import { GitHubModule } from './modules/github/github.module.js';
import { RepoAuditModule } from './modules/repo-audit/repo-audit.module.js';
import { EmailModule } from './modules/email/email.module.js';

@Module({
  imports: [
    // ── Config (global) ───────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── EventEmitter (global) — powers SSE progress streaming ─────────────
    EventEmitterModule.forRoot({
      // Allow wildcard listeners e.g. 'audit:*'
      wildcard: false,
      // Max listeners per event to avoid memory leak warnings
      maxListeners: 20,
    }),

    // ── BullMQ (global) — connects to Redis ───────────────────────────────
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),

    // ── Throttler (global rate limiting) ──────────────────────────────────
    // 20 audit submissions per IP per hour; SSE polling excluded via @SkipThrottle
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 3600_000, // 1 hour in ms
        limit: 20,
      },
    ]),

    // ── Prisma (global) — single shared DB connection ─────────────────────
    PrismaModule,

    // ── Feature Modules ───────────────────────────────────────────────────
    ClaudeModule,
    WalrusModule,
    ReportModule,
    AuditModule,
    UsersModule,
    AuthModule,
    BillingModule,
    ApiKeysModule,
    RateLimitModule,
    OnChainModule,
    GitHubModule,
    RepoAuditModule,
    EmailModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // Apply ThrottlerGuard globally — individual routes can opt-out with @SkipThrottle()
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
