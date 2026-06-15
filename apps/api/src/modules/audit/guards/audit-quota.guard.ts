import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { BillingService } from '../../billing/billing.service.js';

@Injectable()
export class AuditQuotaGuard implements CanActivate {
  constructor(private readonly billingService: BillingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // If request contains txDigest in body, this is a paid public audit. Bypass quota check.
    if (request.body && request.body.txDigest) {
      return true;
    }

    const user = request.user;
    
    if (!user) {
      return false; // Authentication is handled by other guards, but just in case
    }

    const sub = await this.billingService.getStatus(user.userId);
    
    const used = sub ? sub.auditsUsedThisPeriod : 0;
    const limit = sub ? sub.auditsLimit : 3;

    if (used >= limit) {
      throw new ForbiddenException({
        error: 'QUOTA_EXCEEDED',
        upgradeUrl: '/pricing',
      });
    }

    return true;
  }
}
