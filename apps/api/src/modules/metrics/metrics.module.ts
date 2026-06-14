import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
