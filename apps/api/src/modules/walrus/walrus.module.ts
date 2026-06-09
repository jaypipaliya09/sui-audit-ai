import { Module } from '@nestjs/common';
import { WalrusService } from './walrus.service.js';

@Module({
  providers: [WalrusService],
  exports: [WalrusService],
})
export class WalrusModule {}
