import { Controller, Get, Param, BadRequestException } from '@nestjs/common';
import { OnChainRegistryService } from './on-chain-registry.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Controller('on-chain')
export class OnChainController {
  constructor(
    private readonly onChainService: OnChainRegistryService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('verify/:hash')
  async verifyHash(@Param('hash') hash: string) {
    if (!hash || !/^[0-9a-fA-F]{64}$/.test(hash)) {
      throw new BadRequestException('Invalid contract hash format. Expected 64-character hex string.');
    }

    let isVerified = await this.onChainService.verifyAudit(hash);

    // Fallback to local DB check if on-chain verification is unavailable or fails
    if (!isVerified) {
      const singleAudit = await this.prisma.audit.findFirst({
        where: { contractHash: hash, status: 'COMPLETE' },
      });
      if (singleAudit) {
        isVerified = true;
      } else {
        const repoAudit = await this.prisma.contractAudit.findFirst({
          where: { contractHash: hash, status: 'COMPLETE' },
        });
        if (repoAudit) {
          isVerified = true;
        }
      }
    }

    return {
      hash,
      verified: isVerified,
      timestamp: new Date().toISOString(),
    };
  }
}
