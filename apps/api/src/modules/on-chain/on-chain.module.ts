import { Module } from '@nestjs/common';
import { OnChainRegistryService } from './on-chain-registry.service.js';
import { OnChainController } from './on-chain.controller.js';

@Module({
  controllers: [OnChainController],
  providers: [OnChainRegistryService],
  exports: [OnChainRegistryService],
})
export class OnChainModule {}
