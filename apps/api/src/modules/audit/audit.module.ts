import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AUDIT_QUEUE } from '../../common/constants/queue.constants.js';
import { ClaudeModule } from '../claude/claude.module.js';
import { WalrusModule } from '../walrus/walrus.module.js';
import { ReportModule } from '../report/report.module.js';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';
import { AuditProcessor } from './audit.processor.js';
import { AuditGateway } from './audit.gateway.js';
import { AuditRepository } from './audit.repository.js';
import { OnChainModule } from '../on-chain/on-chain.module.js';

@Module({
  imports: [
    // Register the BullMQ queue for this module
    BullModule.registerQueue({ name: AUDIT_QUEUE }),
    // Import service modules we depend on
    ClaudeModule,
    WalrusModule,
    forwardRef(() => ReportModule),
    OnChainModule,
  ],
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditProcessor,
    AuditGateway,
    AuditRepository,
  ],
  exports: [AuditRepository, AuditGateway],
})
export class AuditModule {}
