import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SubscriptionService } from '../../subscription/subscription.service.js';

@Injectable()
export class AuditQuotaGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

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

    const sub = await this.subscriptionService.getStatus(user.userId);
    
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
