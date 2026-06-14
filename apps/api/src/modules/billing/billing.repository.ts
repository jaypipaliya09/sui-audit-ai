import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Subscription, Prisma } from '@prisma/client';

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { stripeCustomerId } });
  }

  async activateSubscription(stripeCustomerId: string, data: Prisma.SubscriptionUpdateInput): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { stripeCustomerId },
      data,
    });
  }

  async resetMonthlyUsage(stripeCustomerId: string): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { stripeCustomerId },
      data: { auditsUsedThisPeriod: 0 },
    });
  }

  async incrementUsage(userId: string, count: number): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { userId },
      data: {
        auditsUsedThisPeriod: {
          increment: count,
        },
      },
    });
  }

  async upsert(userId: string, stripeCustomerId: string): Promise<Subscription> {
    return this.prisma.subscription.upsert({
      where: { userId },
      update: { stripeCustomerId },
      create: {
        userId,
        stripeCustomerId,
        plan: 'FREE',
      },
    });
  }
}
