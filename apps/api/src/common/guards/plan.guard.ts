import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class PlanGuard implements CanActivate {
  private allowedPlans: string[];

  constructor(allowedPlans: string | string[]) {
    this.allowedPlans = Array.isArray(allowedPlans) ? allowedPlans : [allowedPlans];
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (!user.plan) {
      throw new ForbiddenException('User has no active plan');
    }

    if (!this.allowedPlans.includes(user.plan)) {
      throw new ForbiddenException(`Access requires one of the following plans: ${this.allowedPlans.join(', ')}`);
    }

    return true;
  }
}
