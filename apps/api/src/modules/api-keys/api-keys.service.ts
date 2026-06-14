import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKey } from '@prisma/client';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async createKey(userId: string, name: string, scopes: string[]) {
    const rawKey = 'maud_' + crypto.randomBytes(32).toString('hex');
    const keyPrefix = rawKey.substring(0, 12);
    const keyHash = await bcrypt.hash(rawKey, 10);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        keyPrefix,
        scopes,
      },
    });

    return { rawKey, apiKey };
  }

  async listKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  async validateKey(rawKey: string): Promise<ApiKey | null> {
    if (!rawKey.startsWith('maud_')) return null;
    
    const prefix = rawKey.substring(0, 12);
    const candidates = await this.prisma.apiKey.findMany({
      where: { keyPrefix: prefix, revokedAt: null },
      include: { user: true },
    });

    for (const candidate of candidates) {
      const isMatch = await bcrypt.compare(rawKey, candidate.keyHash);
      if (isMatch) {
        // Fire-and-forget update of lastUsedAt
        this.prisma.apiKey.update({
          where: { id: candidate.id },
          data: { lastUsedAt: new Date() },
        }).catch(err => console.error('Failed to update API key lastUsedAt', err));
        
        return candidate;
      }
    }
    
    return null;
  }

  async revokeKey(keyId: string, userId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key || key.userId !== userId) {
      throw new NotFoundException('API Key not found');
    }

    return this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
  }
}
