import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface DashboardMetrics {
  mrr: number;
  newSubscriptionsToday: number;
  churnedSubscriptionsThisMonth: number;
  auditsToday: number;
  auditsThisMonth: number;
  avgAuditLatencyMs: number;
  claudeCostToday: number;
  claudeCostThisMonth: number;
  grossMarginPercent: number;
  avgFindingsPerAudit: number;
  criticalFindingsThisMonth: number;
  queueDepth: number;
  failedAuditsToday: number;
  walrusSuccessRateToday: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a Claude API call with token usage and cost.
   */
  async recordClaudeCall(data: {
    auditId?: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  }): Promise<void> {
    const costUsd =
      (data.inputTokens / 1_000_000) * 3.0 +
      (data.outputTokens / 1_000_000) * 15.0;

    await this.prisma.claudeCallLog.create({
      data: {
        auditId: data.auditId,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        latencyMs: data.latencyMs,
        costUsd,
      },
    });

    this.logger.debug(
      `Recorded Claude call: ${data.inputTokens}in/${data.outputTokens}out, $${costUsd.toFixed(4)}, ${data.latencyMs}ms`,
    );
  }

  /**
   * Aggregate dashboard metrics for the admin panel.
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all queries in parallel
    const [
      auditsToday,
      auditsThisMonth,
      failedAuditsToday,
      queueDepth,
      claudeToday,
      claudeMonth,
      avgLatency,
      findingsAgg,
      criticalFindings,
      subscriptions,
      totalAuditsWithBlob,
      totalAuditsToday,
    ] = await Promise.all([
      // Audits today
      this.prisma.audit.count({
        where: { createdAt: { gte: todayStart } },
      }),
      // Audits this month
      this.prisma.audit.count({
        where: { createdAt: { gte: monthStart } },
      }),
      // Failed audits today
      this.prisma.audit.count({
        where: { createdAt: { gte: todayStart }, status: 'FAILED' },
      }),
      // Queue depth (QUEUED + ANALYZING)
      this.prisma.audit.count({
        where: { status: { in: ['QUEUED', 'ANALYZING'] } },
      }),
      // Claude cost today
      this.prisma.claudeCallLog.aggregate({
        _sum: { costUsd: true },
        where: { createdAt: { gte: todayStart } },
      }),
      // Claude cost this month
      this.prisma.claudeCallLog.aggregate({
        _sum: { costUsd: true },
        where: { createdAt: { gte: monthStart } },
      }),
      // Average latency
      this.prisma.claudeCallLog.aggregate({
        _avg: { latencyMs: true },
        where: { createdAt: { gte: monthStart } },
      }),
      // Average findings per audit (completed audits)
      this.prisma.audit.aggregate({
        _avg: { criticalCount: true, highCount: true, mediumCount: true, lowCount: true },
        where: { status: 'COMPLETE' },
      }),
      // Critical findings this month
      this.prisma.audit.aggregate({
        _sum: { criticalCount: true },
        where: { createdAt: { gte: monthStart }, status: 'COMPLETE' },
      }),
      // Subscriptions (active users with paid plans)
      this.prisma.subscription.count({
        where: { plan: { not: 'FREE' }, status: 'ACTIVE' },
      }),
      // Walrus success rate: audits with blobId today
      this.prisma.audit.count({
        where: { createdAt: { gte: todayStart }, blobId: { not: null }, status: 'COMPLETE' },
      }),
      // Total completed audits today
      this.prisma.audit.count({
        where: { createdAt: { gte: todayStart }, status: { in: ['COMPLETE', 'FAILED'] } },
      }),
    ]);

    const claudeCostToday = claudeToday._sum.costUsd || 0;
    const claudeCostThisMonth = claudeMonth._sum.costUsd || 0;

    // Rough MRR estimate: $29 * developer + $99 * team + $299 * enterprise
    const mrr = subscriptions * 29; // simplified

    const avgFindings =
      (findingsAgg._avg.criticalCount || 0) +
      (findingsAgg._avg.highCount || 0) +
      (findingsAgg._avg.mediumCount || 0) +
      (findingsAgg._avg.lowCount || 0);

    const walrusSuccessRateToday = totalAuditsToday > 0
      ? (totalAuditsWithBlob / totalAuditsToday) * 100
      : 100;

    // Gross margin: (revenue - cost) / revenue * 100
    const estimatedMonthlyRevenue = mrr > 0 ? mrr : 1; // avoid division by zero
    const grossMarginPercent = Math.max(
      0,
      ((estimatedMonthlyRevenue - claudeCostThisMonth) / estimatedMonthlyRevenue) * 100,
    );

    return {
      mrr,
      newSubscriptionsToday: 0, // would need subscription events tracking
      churnedSubscriptionsThisMonth: 0, // would need subscription events tracking
      auditsToday,
      auditsThisMonth,
      avgAuditLatencyMs: Math.round(avgLatency._avg.latencyMs || 0),
      claudeCostToday: Math.round(claudeCostToday * 100) / 100,
      claudeCostThisMonth: Math.round(claudeCostThisMonth * 100) / 100,
      grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
      avgFindingsPerAudit: Math.round(avgFindings * 10) / 10,
      criticalFindingsThisMonth: criticalFindings._sum.criticalCount || 0,
      queueDepth,
      failedAuditsToday,
      walrusSuccessRateToday: Math.round(walrusSuccessRateToday * 10) / 10,
    };
  }
}
