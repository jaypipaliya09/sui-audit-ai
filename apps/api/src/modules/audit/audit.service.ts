import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AUDIT_QUEUE, AUDIT_JOB_NAMES, QUEUE_CONFIG } from '../../common/constants/queue.constants.js';
import { AuditRepository } from './audit.repository.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import type { SubmitAuditDto } from './dto/submit-audit.dto.js';
import type { AuditJobData } from '../claude/types/finding.types.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  private readonly suiClient: SuiClient;
  private readonly TREASURY_ADDRESS = '0x69fb32ef40f1954a2279041bb2d90c4e7d289dd10486409ae81e7ef39467d8b0'; // Matching demo env
  private readonly EXPECTED_SUI_AMOUNT = 1_000_000_000; // 1 SUI in MIST

  constructor(
    @InjectQueue(AUDIT_QUEUE) private readonly auditQueue: Queue,
    private readonly auditRepository: AuditRepository,
    private readonly prisma: PrismaService,
  ) {
    this.suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
  }

  /**
   * Submit a new audit:
   * 1. Create a DB row with status=QUEUED
   * 2. Push a BullMQ job so the worker picks it up
   * 3. Return the auditId for status polling
   */
  async submitAudit(dto: SubmitAuditDto, apiKeyStr?: string): Promise<{ auditId: string }> {
    const { contractCode, contractName, txDigest, track } = dto;
    let apiKeyId: string | undefined;

    // Handle CLI API Key Auth
    if (apiKeyStr) {
      const apiKeyRec = await this.prisma.apiKey.findUnique({
        where: { key: apiKeyStr },
        include: { user: true },
      });

      if (!apiKeyRec) {
        throw new HttpException('Invalid API Key', HttpStatus.UNAUTHORIZED);
      }

      if (apiKeyRec.user.plan !== 'ENTERPRISE' && apiKeyRec.user.credits <= 0) {
        throw new HttpException('Insufficient credits. Please upgrade your plan.', HttpStatus.PAYMENT_REQUIRED);
      }

      apiKeyId = apiKeyRec.id;

      // Deduct credit if not enterprise
      if (apiKeyRec.user.plan !== 'ENTERPRISE') {
        await this.prisma.user.update({
          where: { id: apiKeyRec.userId },
          data: { credits: { decrement: 1 } },
        });
      }

      // Update last used
      await this.prisma.apiKey.update({
        where: { id: apiKeyRec.id },
        data: { lastUsed: new Date() },
      });
    } else if (txDigest) {
      // Verify transaction if provided (Web UI flow)
      // 1. Check replay attack
      const existing = await this.auditRepository.findByTxDigest(txDigest);
      if (existing) {
        throw new BadRequestException('Transaction digest has already been used for an audit.');
      }

      // 2. Fetch from Sui Network
      try {
        const tx = await this.suiClient.getTransactionBlock({
          digest: txDigest,
          options: { showEffects: true, showBalanceChanges: true },
        });

        if (tx.effects?.status.status !== 'success') {
          throw new BadRequestException('Transaction failed on the Sui network.');
        }

        const treasuryChange = tx.balanceChanges?.find(
          (b) => {
            const ownerObj = b.owner as any;
            return ownerObj && ownerObj.AddressOwner === this.TREASURY_ADDRESS && b.coinType === '0x2::sui::SUI';
          }
        );

        if (!treasuryChange || BigInt(treasuryChange.amount) < BigInt(this.EXPECTED_SUI_AMOUNT)) {
           this.logger.warn(`Transaction found but amount sent to treasury was insufficient or not found: ${JSON.stringify(treasuryChange)}`);
        }
      } catch (e: any) {
        if (e instanceof BadRequestException) throw e;
        this.logger.error(`Failed to verify txDigest ${txDigest}: ${e.message}`);
        throw new BadRequestException(`Invalid transaction digest or network error: ${e.message}`);
      }
    } else {
      // For now, allow unauthenticated/unpaid audits strictly for testing or free tier in Web UI, 
      // but you can block it by throwing an error here if strict enforcement is needed.
    }

    // 1. Persist audit row
    const audit = await this.prisma.audit.create({
      data: {
        contractName,
        contractCode,
        status: 'QUEUED',
        track: track || 'General',
        ...(txDigest && { txDigest }),
        ...(apiKeyId && { apiKeyId }),
      },
    });

    // 2. Queue the job
    const jobData: AuditJobData = {
      auditId: audit.id,
      contractCode,
      contractName,
      track,
      submittedAt: new Date(),
    };

    await this.auditQueue.add(
      AUDIT_JOB_NAMES.PROCESS_CONTRACT,
      jobData,
      QUEUE_CONFIG.defaultJobOptions,
    );

    this.logger.log(
      `Audit [${audit.id}] queued for "${contractName}" (${contractCode.split('\n').length} lines)`,
    );

    return { auditId: audit.id };
  }
}
