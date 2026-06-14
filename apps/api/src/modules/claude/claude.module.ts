import { Module } from '@nestjs/common';
import { ClaudeService } from './claude.service.js';
import { MetricsModule } from '../metrics/metrics.module.js';

@Module({
  imports: [MetricsModule],
  providers: [ClaudeService],
  exports: [ClaudeService],
})
export class ClaudeModule {}
