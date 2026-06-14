import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { BillingRepository } from './billing.repository.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule],
  controllers: [BillingController],
  providers: [BillingService, BillingRepository],
  exports: [BillingService],
})
export class BillingModule {}
