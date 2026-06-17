import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface DashboardMetrics {
  totalUsers: number;
  paidSubscriptions: number;
  totalAudits: number;
  auditsToday: number;
  auditsThisMonth: number;
  avgAuditLatencyMs: number;
  claudeCostToday: number;
  claudeCostThisMonth: number;
  avgFindingsPerAudit: number;
  criticalFindingsThisMonth: number;
  queueDepth: number;
  failedAuditsToday: number;
  walrusSuccessRateToday: number;
}

export interface TimeBucket {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface UsageStats {
  granularity: Granularity;
  from: string;
  to: string;
  auditsOverTime: TimeBucket[];
  newUsersOverTime: TimeBucket[];
  findingsBySeverity: { severity: string; count: number }[];
  riskDistribution: { risk: string; count: number }[];
}

export type Granularity = 'day' | 'month' | 'year';

export interface UsageStatsQuery {
  granularity?: Granularity;
  from?: string; // ISO date (inclusive)
  to?: string; // ISO date (inclusive)
  plan?: string; // FREE | DEVELOPER | TEAM | ENTERPRISE
  status?: string; // AuditStatus
  risk?: string; // RiskLevel
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
   * All values are derived from real data — no estimates or placeholders.
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      paidSubscriptions,
      totalAudits,
      auditsToday,
      auditsThisMonth,
      failedAuditsToday,
      queueDepth,
      claudeToday,
      claudeMonth,
      avgLatency,
      findingsAgg,
      criticalFindings,
      totalAuditsWithBlob,
      totalAuditsToday,
    ] = await Promise.all([
      // Total registered users
      this.prisma.user.count(),
      // Active paid subscriptions
      this.prisma.subscription.count({
        where: { plan: { not: 'FREE' }, status: 'ACTIVE' },
      }),
      // Total audits all-time
      this.prisma.audit.count(),
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
      // Average latency this month
      this.prisma.claudeCallLog.aggregate({
        _avg: { latencyMs: true },
        where: { createdAt: { gte: monthStart } },
      }),
      // Average findings per completed audit
      this.prisma.audit.aggregate({
        _avg: { criticalCount: true, highCount: true, mediumCount: true, lowCount: true },
        where: { status: 'COMPLETE' },
      }),
      // Critical findings this month
      this.prisma.audit.aggregate({
        _sum: { criticalCount: true },
        where: { createdAt: { gte: monthStart }, status: 'COMPLETE' },
      }),
      // Walrus success rate: completed audits with blobId today
      this.prisma.audit.count({
        where: { createdAt: { gte: todayStart }, blobId: { not: null }, status: 'COMPLETE' },
      }),
      // Total finished audits today (COMPLETE or FAILED)
      this.prisma.audit.count({
        where: { createdAt: { gte: todayStart }, status: { in: ['COMPLETE', 'FAILED'] } },
      }),
    ]);

    const claudeCostToday = claudeToday._sum.costUsd || 0;
    const claudeCostThisMonth = claudeMonth._sum.costUsd || 0;

    const avgFindings =
      (findingsAgg._avg.criticalCount || 0) +
      (findingsAgg._avg.highCount || 0) +
      (findingsAgg._avg.mediumCount || 0) +
      (findingsAgg._avg.lowCount || 0);

    const walrusSuccessRateToday =
      totalAuditsToday > 0 ? (totalAuditsWithBlob / totalAuditsToday) * 100 : 100;

    return {
      totalUsers,
      paidSubscriptions,
      totalAudits,
      auditsToday,
      auditsThisMonth,
      avgAuditLatencyMs: Math.round(avgLatency._avg.latencyMs || 0),
      claudeCostToday: Math.round(claudeCostToday * 100) / 100,
      claudeCostThisMonth: Math.round(claudeCostThisMonth * 100) / 100,
      avgFindingsPerAudit: Math.round(avgFindings * 10) / 10,
      criticalFindingsThisMonth: criticalFindings._sum.criticalCount || 0,
      queueDepth,
      failedAuditsToday,
      walrusSuccessRateToday: Math.round(walrusSuccessRateToday * 10) / 10,
    };
  }

  /**
   * Usage statistics for admin charts: audit/user activity over the last 30
   * days, plus findings-by-severity and overall-risk distributions.
   */
  async getUsageStats(query: UsageStatsQuery = {}): Promise<UsageStats> {
    const granularity: Granularity = query.granularity || 'day';
    const { windowStart, windowEnd } = this.resolveWindow(granularity, query.from, query.to);

    // Shared filters applied to all audit-based series.
    const auditWhere: any = { createdAt: { gte: windowStart, lte: windowEnd } };
    if (query.status) auditWhere.status = query.status;
    if (query.risk) auditWhere.overallRisk = query.risk;
    if (query.plan) auditWhere.user = { subscription: { plan: query.plan } };

    // Findings/risk distributions only consider completed audits, but still
    // respect the plan/date/risk filters where applicable.
    const completedWhere: any = {
      ...auditWhere,
      status: query.status || 'COMPLETE',
    };
    const riskWhere: any = { ...completedWhere, overallRisk: { not: null } };
    if (query.risk) riskWhere.overallRisk = query.risk;

    const userWhere: any = { createdAt: { gte: windowStart, lte: windowEnd } };
    if (query.plan) userWhere.subscription = { plan: query.plan };

    const [audits, users, findingsAgg, risks] = await Promise.all([
      this.prisma.audit.findMany({ where: auditWhere, select: { createdAt: true } }),
      this.prisma.user.findMany({ where: userWhere, select: { createdAt: true } }),
      this.prisma.audit.aggregate({
        _sum: { criticalCount: true, highCount: true, mediumCount: true, lowCount: true, infoCount: true },
        where: completedWhere,
      }),
      this.prisma.audit.groupBy({
        by: ['overallRisk'],
        _count: { _all: true },
        where: riskWhere,
      }),
    ]);

    const auditsOverTime = this.bucketByPeriod(audits.map((a) => a.createdAt), windowStart, windowEnd, granularity);
    const newUsersOverTime = this.bucketByPeriod(users.map((u) => u.createdAt), windowStart, windowEnd, granularity);

    const findingsBySeverity = [
      { severity: 'Critical', count: findingsAgg._sum.criticalCount || 0 },
      { severity: 'High', count: findingsAgg._sum.highCount || 0 },
      { severity: 'Medium', count: findingsAgg._sum.mediumCount || 0 },
      { severity: 'Low', count: findingsAgg._sum.lowCount || 0 },
      { severity: 'Info', count: findingsAgg._sum.infoCount || 0 },
    ];

    const riskDistribution = risks.map((r) => ({
      risk: r.overallRisk as string,
      count: r._count._all,
    }));

    return {
      granularity,
      from: this.toDateKey(windowStart),
      to: this.toDateKey(windowEnd),
      auditsOverTime,
      newUsersOverTime,
      findingsBySeverity,
      riskDistribution,
    };
  }

  /**
   * Resolve the [start, end] window. If from/to are supplied they win;
   * otherwise default to a sensible span per granularity (30 days / 12 months
   * / 5 years). Bounds are snapped to the period start/end.
   */
  private resolveWindow(granularity: Granularity, from?: string, to?: string) {
    const now = new Date();
    const end = to ? new Date(to) : now;
    const windowEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

    let windowStart: Date;
    if (from) {
      const f = new Date(from);
      windowStart = new Date(f.getFullYear(), f.getMonth(), f.getDate());
    } else if (granularity === 'year') {
      windowStart = new Date(end.getFullYear() - 4, 0, 1);
    } else if (granularity === 'month') {
      windowStart = new Date(end.getFullYear(), end.getMonth() - 11, 1);
    } else {
      windowStart = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    }

    return { windowStart, windowEnd };
  }

  /**
   * Bucket timestamps into per-period counts across the window, zero-filling
   * empty periods so charts render a continuous series.
   */
  private bucketByPeriod(
    dates: Date[],
    windowStart: Date,
    windowEnd: Date,
    granularity: Granularity,
  ): TimeBucket[] {
    const buckets = new Map<string, number>();
    const cursor = this.periodStart(windowStart, granularity);
    while (cursor <= windowEnd) {
      buckets.set(this.periodKey(cursor, granularity), 0);
      this.advance(cursor, granularity);
    }

    for (const date of dates) {
      const key = this.periodKey(date, granularity);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }
    }

    return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
  }

  private periodStart(date: Date, granularity: Granularity): Date {
    if (granularity === 'year') return new Date(date.getFullYear(), 0, 1);
    if (granularity === 'month') return new Date(date.getFullYear(), date.getMonth(), 1);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private advance(date: Date, granularity: Granularity): void {
    if (granularity === 'year') date.setFullYear(date.getFullYear() + 1);
    else if (granularity === 'month') date.setMonth(date.getMonth() + 1);
    else date.setDate(date.getDate() + 1);
  }

  private periodKey(date: Date, granularity: Granularity): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (granularity === 'year') return `${y}`;
    if (granularity === 'month') return `${y}-${m}`;
    return `${y}-${m}-${d}`;
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
