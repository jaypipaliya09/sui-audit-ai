import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from './admin.guard.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /admin/metrics → DashboardMetrics
   */
  @Get('metrics')
  async getMetrics() {
    return this.metricsService.getDashboardMetrics();
  }

  /**
   * GET /admin/users → paginated user list
   */
  @Get('users')
  async listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          subscription: { select: { plan: true } },
          _count: { select: { audits: true } },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * GET /admin/users/:id → user detail with all audits
   */
  @Get('users/:id')
  async getUserDetail(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        audits: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            contractName: true,
            status: true,
            overallRisk: true,
            createdAt: true,
            blobId: true,
          },
        },
        _count: { select: { audits: true } },
      },
    });

    return user;
  }

  /**
   * PATCH /admin/users/:id/plan → override user plan
   */
  @Patch('users/:id/plan')
  async updateUserPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('plan') plan: string,
  ) {
    const validPlans = ['FREE', 'DEVELOPER', 'TEAM', 'ENTERPRISE'];
    if (!validPlans.includes(plan)) {
      throw new Error(`Invalid plan: ${plan}. Must be one of: ${validPlans.join(', ')}`);
    }

    const user = await this.prisma.subscription.update({
      where: { userId: id },
      data: { plan: plan as any },
      select: { userId: true, plan: true },
    });

    return { message: `Plan updated to ${plan}`, user };
  }

  /**
   * GET /admin/audits → recent audits with status, cost, latency
   */
  @Get('audits')
  async listAudits(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const [audits, total] = await Promise.all([
      this.prisma.audit.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          contractName: true,
          status: true,
          overallRisk: true,
          createdAt: true,
          blobId: true,
          userId: true,
          user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.audit.count(),
    ]);

    // Attach Claude call cost/latency to each audit
    const auditIds = audits.map((a) => a.id);
    const claudeCalls = await this.prisma.claudeCallLog.findMany({
      where: { auditId: { in: auditIds } },
      select: { auditId: true, costUsd: true, latencyMs: true },
    });

    const costMap = new Map<string, { cost: number; latency: number }>();
    for (const call of claudeCalls) {
      if (call.auditId) {
        const existing = costMap.get(call.auditId) || { cost: 0, latency: 0 };
        costMap.set(call.auditId, {
          cost: existing.cost + call.costUsd,
          latency: Math.max(existing.latency, call.latencyMs),
        });
      }
    }

    const enriched = audits.map((audit) => ({
      ...audit,
      claudeCost: costMap.get(audit.id)?.cost || 0,
      claudeLatencyMs: costMap.get(audit.id)?.latency || 0,
    }));

    return {
      data: enriched,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
