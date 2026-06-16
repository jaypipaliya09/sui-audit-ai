import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuiClient } from '@mysten/sui.js/client';
import { BillingRepository } from './billing.repository.js';
import { UsersService } from '../users/users.service.js';

const FULLNODE_URLS: Record<string, string> = {
  mainnet: 'https://fullnode.mainnet.sui.io',
  testnet: 'https://fullnode.testnet.sui.io',
  devnet: 'https://fullnode.devnet.sui.io',
};

/** Purchasable plans, priced in USDC. PAY_AS_YOU_GO is handled per-audit (escrow). */
export const PLANS: Record<string, { priceUsdc: number; auditsLimit: number }> = {
  DEVELOPER: { priceUsdc: 10, auditsLimit: 25 },
  TEAM: { priceUsdc: 30, auditsLimit: 100 },
  ENTERPRISE: { priceUsdc: 100, auditsLimit: 1000 },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly sui: SuiClient;
  private readonly treasury: string;
  private readonly usdcType: string;
  private readonly usdcDecimals: number;

  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    const network = this.configService.get<string>('SUI_NETWORK') || 'testnet';
    this.sui = new SuiClient({ url: FULLNODE_URLS[network] || FULLNODE_URLS.testnet });
    this.treasury = (this.configService.get<string>('TREASURY_ADDRESS') || '').toLowerCase();
    this.usdcType =
      this.configService.get<string>('USDC_COIN_TYPE') ||
      '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC';
    this.usdcDecimals = Number(this.configService.get<string>('USDC_DECIMALS') || 6);
  }

  getPlans() {
    return PLANS;
  }

  async getStatus(userId: string) {
    const sub = await this.billingRepository.findByUserId(userId);
    if (!sub) {
      return { plan: 'FREE', auditsUsedThisPeriod: 0, auditsLimit: 3, status: 'ACTIVE' };
    }
    return sub;
  }

  /**
   * Activate a plan after the user paid in USDC from their Slush wallet.
   * Verifies the on-chain transfer to the treasury before granting the plan.
   */
  async purchasePlan(userId: string, plan: string, txDigest: string) {
    const planDef = PLANS[plan];
    if (!planDef) throw new BadRequestException(`Unknown plan: ${plan}`);
    if (!txDigest) throw new BadRequestException('Missing payment txDigest');

    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    if (await this.billingRepository.isTxUsed(txDigest)) {
      throw new BadRequestException('This payment has already been redeemed');
    }

    await this.verifyUsdcPayment(txDigest, planDef.priceUsdc);

    await this.billingRepository.ensure(userId, user.suiAddress ?? undefined);
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return this.billingRepository.update(userId, {
      plan: plan as any,
      status: 'ACTIVE',
      auditsLimit: planDef.auditsLimit,
      auditsUsedThisPeriod: 0,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      lastPaymentTx: txDigest,
    });
  }

  /** Confirm the tx moved at least `priceUsdc` of USDC to the treasury. */
  private async verifyUsdcPayment(txDigest: string, priceUsdc: number): Promise<void> {
    if (!this.treasury) {
      throw new BadRequestException('TREASURY_ADDRESS is not configured');
    }

    let tx;
    try {
      tx = await this.sui.getTransactionBlock({
        digest: txDigest,
        options: { showBalanceChanges: true, showEffects: true },
      });
    } catch (err: any) {
      this.logger.error(`Failed to fetch tx ${txDigest}: ${err.message}`);
      throw new BadRequestException('Payment transaction not found');
    }

    if (tx.effects?.status?.status !== 'success') {
      throw new BadRequestException('Payment transaction did not succeed');
    }

    const required = BigInt(Math.round(priceUsdc * 10 ** this.usdcDecimals));
    const credited = (tx.balanceChanges ?? []).find((c: any) => {
      const ownerAddr =
        typeof c.owner === 'object' && c.owner && 'AddressOwner' in c.owner
          ? (c.owner as any).AddressOwner.toLowerCase()
          : '';
      return (
        c.coinType === this.usdcType &&
        ownerAddr === this.treasury &&
        BigInt(c.amount) >= required
      );
    });

    if (!credited) {
      throw new BadRequestException(
        `Payment does not transfer ${priceUsdc} USDC to the treasury`,
      );
    }
  }

  async checkAndIncrementUsage(userId: string, count: number = 1): Promise<boolean> {
    // TEMPORARY BYPASS FOR TESTING — remove this when plan enforcement is live
    this.logger.debug(`[BYPASS] Skipping plan check for userId=${userId}, count=${count}`);
    return true;

    /* Original quota logic — uncomment when plan enforcement is desired
    const sub = await this.billingRepository.ensure(userId);
    if (sub.auditsUsedThisPeriod + count > sub.auditsLimit) return false;
    await this.billingRepository.incrementUsage(userId, count);
    return true;
    */
  }
}
