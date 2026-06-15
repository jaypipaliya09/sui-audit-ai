import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service.js';
import { BillingService } from '../../modules/billing/billing.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FlexibleAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly apiKeysService: ApiKeysService,
    private readonly billingService: BillingService,
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

    if (authHeader.startsWith('Bearer maud_')) {
      // Validate API Key
      const rawKey = authHeader.replace('Bearer ', '');
      const apiKey = await this.apiKeysService.validateKey(rawKey);
      
      if (!apiKey) {
        throw new UnauthorizedException('Invalid API Key');
      }

      const sub = await this.billingService.getStatus(apiKey.userId);

      // We included `user` in validateKey
      const userObj = (apiKey as any).user;

      request.user = {
        userId: apiKey.userId,
        email: userObj?.email,
        role: userObj?.role,
        orgId: userObj?.orgId,
        plan: sub ? sub.plan : 'FREE',
      };

      return true;
    } else if (authHeader.startsWith('Bearer eyJ')) {
      // Validate JWT
      const token = authHeader.replace('Bearer ', '');
      try {
        const secret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'super_secret_access_key_123';
        const payload = await this.jwtService.verifyAsync(token, { secret });
        
        const sub = await this.billingService.getStatus(payload.sub);

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
