import { Module } from '@nestjs/common';
import { OnChainRegistryService } from './on-chain-registry.service.js';

@Module({
  providers: [OnChainRegistryService],
  exports: [OnChainRegistryService],
})
export class OnChainModule {}
