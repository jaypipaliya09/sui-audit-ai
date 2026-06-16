import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /** Public: available plans + USDC prices for the pricing page. */
  @Get('plans')
  getPlans() {
    return this.billingService.getPlans();
  }

  /**
   * Activate a plan after paying in USDC from the Slush wallet.
   * The frontend signs the USDC transfer and posts the resulting txDigest.
   */
  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  async purchase(
    @CurrentUser() user: any,
    @Body() body: { plan: string; txDigest: string },
  ) {
    const userId = user?.sub || user?.id;
    return this.billingService.purchasePlan(userId, body.plan, body.txDigest);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser() user: any) {
    const userId = user?.sub || user?.id;
    return this.billingService.getStatus(userId);
  }
}
