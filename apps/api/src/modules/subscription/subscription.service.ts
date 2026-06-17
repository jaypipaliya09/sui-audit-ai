import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Subscription } from '@prisma/client';

/**
 * Lean subscription service. Self-serve billing (USDC purchase, pricing) was
 * removed; plans are now assigned by an admin. This keeps the two pieces the
 * audit pipeline still needs: reading a user's plan/quota and enforcing it.
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Current plan + usage for a user. Falls back to FREE defaults. */
  async getStatus(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      return { plan: 'FREE', auditsUsedThisPeriod: 0, auditsLimit: 3, status: 'ACTIVE' };
    }
    return sub;
  }

  /** Ensure a FREE subscription row exists for the user. */
  private async ensure(userId: string): Promise<Subscription> {
    return this.prisma.subscription.upsert({
      where: { userId },
      update: {},
      create: { userId, plan: 'FREE' },
    });
  }

  /**
   * Returns true and increments usage if the user is within their audit quota,
   * false if the quota would be exceeded.
   */
  async checkAndIncrementUsage(userId: string, count: number = 1): Promise<boolean> {
    const sub = await this.ensure(userId);
    if (sub.auditsUsedThisPeriod + count > sub.auditsLimit) {
      return false;
    }
    await this.prisma.subscription.update({
      where: { userId },
      data: { auditsUsedThisPeriod: { increment: count } },
    });
    return true;
  }
}
