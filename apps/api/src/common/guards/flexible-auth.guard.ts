import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SubscriptionService } from '../../modules/subscription/subscription.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FlexibleAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // If request contains txDigest in body, this is a paid public audit. Bypass authorization check.
    if (request.body && request.body.txDigest) {
      return true;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    if (authHeader.startsWith('Bearer eyJ')) {
      // Validate JWT
      const token = authHeader.replace('Bearer ', '');
      try {
        const secret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'super_secret_access_key_123';
        const payload = await this.jwtService.verifyAsync(token, { secret });
        
        const sub = await this.subscriptionService.getStatus(payload.sub);

        request.user = {
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
          orgId: payload.orgId,
          plan: sub ? sub.plan : 'FREE',
        };
        
        return true;
      } catch (err) {
        throw new UnauthorizedException('Invalid JWT');
      }
    }

    throw new UnauthorizedException('Unsupported Authorization format');
  }
}
