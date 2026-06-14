import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminGuard } from './admin.guard.js';
import { MetricsModule } from '../metrics/metrics.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [MetricsModule, PrismaModule],
  controllers: [AdminController],
  providers: [AdminGuard],
  exports: [AdminGuard],
})
export class AdminModule {}
