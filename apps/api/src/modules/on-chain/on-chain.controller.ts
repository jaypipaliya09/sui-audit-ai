import { Controller, Get, Param, BadRequestException } from '@nestjs/common';
import { OnChainRegistryService } from './on-chain-registry.service.js';

@Controller('on-chain')
export class OnChainController {
  constructor(private readonly onChainService: OnChainRegistryService) {}

  @Get('verify/:hash')
  async verifyHash(@Param('hash') hash: string) {
    if (!hash || !/^[0-9a-fA-F]{64}$/.test(hash)) {
      throw new BadRequestException('Invalid contract hash format. Expected 64-character hex string.');
    }

    const isVerified = await this.onChainService.verifyAudit(hash);

    return {
      hash,
      verified: isVerified,
      timestamp: new Date().toISOString(),
    };
  }
}
