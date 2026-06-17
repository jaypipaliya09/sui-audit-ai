import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from './admin.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UsageStatsQuery } from '../metrics/metrics.service.js';

@Controller('admin')
@SkipThrottle()
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
   * GET /admin/usage → time-series + distribution stats for charts
   */
  @Get('usage')
  async getUsage(
    @Query('granularity') granularity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('plan') plan?: string,
    @Query('status') status?: string,
    @Query('risk') risk?: string,
  ) {
    const g = granularity === 'month' || granularity === 'year' ? granularity : 'day';
    const query: UsageStatsQuery = {
      granularity: g,
      from: from || undefined,
      to: to || undefined,
      plan: plan || undefined,
      status: status || undefined,
      risk: risk || undefined,
    };
    return this.metricsService.getUsageStats(query);
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
          suiAddress: true,
          role: true,
          isBlocked: true,
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
        subscription: { select: { plan: true } },
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
      throw new BadRequestException(
        `Invalid plan: ${plan}. Must be one of: ${validPlans.join(', ')}`,
      );
    }

    const user = await this.prisma.subscription.upsert({
      where: { userId: id },
      update: { plan: plan as any },
      create: { userId: id, plan: plan as any },
      select: { userId: true, plan: true },
    });

    return { message: `Plan updated to ${plan}`, user };
  }

  /**
   * PATCH /admin/users/:id/status → block or unblock a user
   */
  @Patch('users/:id/status')
  async setUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isBlocked') isBlocked: boolean,
    @CurrentUser() admin: any,
  ) {
    const adminId = admin?.userId || admin?.sub || admin?.id;
    if (id === adminId) {
      throw new ForbiddenException('You cannot block your own account.');
    }
    if (typeof isBlocked !== 'boolean') {
      throw new BadRequestException('`isBlocked` must be a boolean.');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { isBlocked },
      select: { id: true, email: true, isBlocked: true },
    });

    return { message: isBlocked ? 'User blocked' : 'User unblocked', user };
  }

  /**
   * DELETE /admin/users/:id → permanently delete a user and all their data
   */
  @Delete('users/:id')
  async deleteUser(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: any) {
    const adminId = admin?.userId || admin?.sub || admin?.id;
    if (id === adminId) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    const target = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { role: true },
    });

    // Never allow deleting the last remaining admin/owner.
    if (target.role === 'ADMIN' || target.role === 'OWNER') {
      const adminCount = await this.prisma.user.count({
        where: { role: { in: ['ADMIN', 'OWNER'] } },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot delete the last administrator.');
      }
    }

    // Delete dependent rows before the user to satisfy FK constraints.
    await this.prisma.$transaction(async (tx) => {
      const repoAudits = await tx.repoAudit.findMany({
        where: { userId: id },
        select: { id: true },
      });
      const repoAuditIds = repoAudits.map((r) => r.id);
      if (repoAuditIds.length > 0) {
        await tx.contractAudit.deleteMany({ where: { repoAuditId: { in: repoAuditIds } } });
        await tx.repoAudit.deleteMany({ where: { id: { in: repoAuditIds } } });
      }
      await tx.audit.deleteMany({ where: { userId: id } });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.emailVerificationToken.deleteMany({ where: { userId: id } });
      await tx.subscription.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    return { message: 'User deleted', id };
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
