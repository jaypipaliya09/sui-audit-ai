import { Module } from '@nestjs/common';
import { OnChainRegistryService } from './on-chain-registry.service.js';
import { OnChainController } from './on-chain.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [OnChainController],
  providers: [OnChainRegistryService],
  exports: [OnChainRegistryService],
})
export class OnChainModule {}
