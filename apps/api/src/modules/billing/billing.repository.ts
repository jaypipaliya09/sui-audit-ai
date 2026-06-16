import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Subscription, Prisma } from '@prisma/client';

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }

  async update(userId: string, data: Prisma.SubscriptionUpdateInput): Promise<Subscription> {
    return this.prisma.subscription.update({ where: { userId }, data });
  }

  async resetMonthlyUsage(userId: string): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { userId },
      data: { auditsUsedThisPeriod: 0 },
    });
  }

  async incrementUsage(userId: string, count: number): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { userId },
      data: { auditsUsedThisPeriod: { increment: count } },
    });
  }

  /** Ensure a subscription row exists for the user (FREE by default). */
  async ensure(userId: string, walletAddress?: string): Promise<Subscription> {
    return this.prisma.subscription.upsert({
      where: { userId },
      update: walletAddress ? { walletAddress } : {},
      create: { userId, walletAddress, plan: 'FREE' },
    });
  }

  /** Has this payment tx already been redeemed for a plan? */
  async isTxUsed(txDigest: string): Promise<boolean> {
    const existing = await this.prisma.subscription.findUnique({
      where: { lastPaymentTx: txDigest },
    });
    return !!existing;
  }
}
