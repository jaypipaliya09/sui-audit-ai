import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyPersonalMessage } from '@mysten/sui.js/verify';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SuiAuthService {
  private readonly redis: Redis;

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    this.redis = new Redis({ host, port });
  }

  async generateNonce(address: string): Promise<string> {
    const nonce = crypto.randomBytes(32).toString('hex');
    await this.redis.set(`nonce:${address}`, nonce, 'EX', 300);
    return nonce;
  }

  async verifySuiSignature(address: string, signedMessage: string, signature: string) {
    const nonce = await this.redis.get(`nonce:${address}`);
    if (!nonce) {
      throw new UnauthorizedException('Nonce expired or invalid');
    }

    try {
      const messageBytes = new TextEncoder().encode(nonce);
      // Ensure using the correct verifyPersonalMessageSignature based on version
      const publicKey = await verifyPersonalMessage(messageBytes, signature);
      
      const recoveredAddress = publicKey.toSuiAddress();
      if (recoveredAddress !== address) {
         throw new UnauthorizedException('Signature address mismatch');
      }

      await this.redis.del(`nonce:${address}`);
      const user = await this.usersService.upsertBySuiAddress(address);
      return user;
    } catch (e) {
      throw new UnauthorizedException('Invalid signature');
    }
  }
}
