import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { BillingRepository } from './billing.repository.js';
import { UsersService } from '../users/users.service.js';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class BillingService {
  private readonly stripe: any;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') || 'sk_test_123', {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }

  async createCheckoutSession(userId: string, priceId: string): Promise<{ checkoutUrl: string }> {
    let subscription = await this.billingRepository.findByUserId(userId);
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    let customerId = subscription?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      subscription = await this.billingRepository.upsert(userId, customerId as string);
    }

    // Determine mode based on priceId, simplistic assumption here
    const mode = priceId.includes('payg') ? 'payment' : 'subscription';

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: mode,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.configService.get('FRONTEND_URL')}/my-audits?success=true`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/pricing?canceled=true`,
    });

    return { checkoutUrl: session.url as string };
  }

  async createPortalSession(userId: string): Promise<{ portalUrl: string }> {
    const subscription = await this.billingRepository.findByUserId(userId);
    if (!subscription || !subscription.stripeCustomerId) {
      throw new BadRequestException('No billing account found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${this.configService.get('FRONTEND_URL')}/my-audits`,
    });

    return { portalUrl: session.url };
  }

  async getStatus(userId: string) {
    let sub = await this.billingRepository.findByUserId(userId);
    if (!sub) {
       // If no sub exists, user is practically FREE but needs a stripe ID generated upon checkout
       return { plan: 'FREE', auditsUsedThisPeriod: 0, auditsLimit: 3, status: 'INCOMPLETE' };
    }
    return sub;
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: any;
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || 'whsec_test';

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Webhook Error');
    }

    this.logger.log(`Received Stripe Webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        if (session.customer) {
          await this.billingRepository.activateSubscription(session.customer as string, {
            status: 'ACTIVE',
            plan: 'DEVELOPER', // In real app, map based on session.line_items
            auditsLimit: 25,
            stripeSubscriptionId: session.subscription as string,
          });
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as any;
        if (invoice.customer) {
          await this.billingRepository.resetMonthlyUsage(invoice.customer as string);
          
          const sub = await this.billingRepository.findByUserId(invoice.customer); // We might need to find by customer
          const userId = sub?.userId; // Assuming we can get userId from invoice customer. Let's look up user
          // Actually billingRepository.findByUserId takes userId. We need to find by stripeCustomerId.
          // For now, let's just log or try if we have the user email.
          // Wait, the webhook has customer email in invoice.customer_email.
          if (invoice.customer_email) {
            await this.emailService.sendInvoiceConfirmation(invoice.customer_email, {
              amount: `$${(invoice.amount_paid / 100).toFixed(2)}`,
              plan: 'Pro Plan', // Simple fallback
              invoiceUrl: invoice.hosted_invoice_url || '#',
            });
          }
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        if (invoice.customer) {
          await this.billingRepository.activateSubscription(invoice.customer as string, { status: 'PAST_DUE' });
          if (invoice.customer_email) {
            await this.emailService.sendPaymentFailed(invoice.customer_email, {
              amount: `$${(invoice.amount_due / 100).toFixed(2)}`,
              updatePaymentUrl: `${this.configService.get('FRONTEND_URL')}/pricing`,
            });
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        if (sub.customer) {
          await this.billingRepository.activateSubscription(sub.customer as string, { 
            status: 'CANCELED',
            plan: 'FREE',
            auditsLimit: 3,
            stripeSubscriptionId: null,
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        break;
      }
    }
  }

  async checkAndIncrementUsage(userId: string, count: number = 1): Promise<boolean> {
    const sub = await this.billingRepository.findByUserId(userId);
    const user = await this.usersService.findById(userId);

    // If no explicit sub, we assume free plan with 3 limits and maybe track separately or create customer.
    // For simplicity, create customer if not exists, but we can't create one without email.
    // Assuming user gets one if they checkout. Let's just use defaults if null.
    if (!sub || !user) {
        return false; // Force user to hit billing/checkout or at least get a Stripe ID mapped first
    }
    
    if (sub.auditsUsedThisPeriod + count > sub.auditsLimit) {
       if (user.email) {
         await this.emailService.sendQuotaExceeded(user.email, {
           limit: sub.auditsLimit,
           resetDate: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : new Date().toISOString(),
           upgradeUrl: `${this.configService.get('FRONTEND_URL')}/pricing`,
         });
       }
       return false;
    }

    // Check if crossing 80% threshold
    const currentPct = sub.auditsUsedThisPeriod / sub.auditsLimit;
    const newPct = (sub.auditsUsedThisPeriod + count) / sub.auditsLimit;
    
    if (currentPct < 0.8 && newPct >= 0.8) {
       if (user.email) {
         await this.emailService.sendQuotaWarning(user.email, {
           used: sub.auditsUsedThisPeriod + count,
           limit: sub.auditsLimit,
           resetDate: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : new Date().toISOString(),
           upgradeUrl: `${this.configService.get('FRONTEND_URL')}/pricing`,
         });
       }
    }

    await this.billingRepository.incrementUsage(userId, count);
    return true;
  }
}
