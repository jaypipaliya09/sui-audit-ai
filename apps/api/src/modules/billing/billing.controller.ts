import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { Request } from 'express';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(@CurrentUser() user: any, @Body() body: { priceId: string }) {
    const userId = user?.sub || user?.id;
    return this.billingService.createCheckoutSession(userId, body.priceId);
  }

  @Post('webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = req.rawBody; // NestJS rawBody feature must be enabled in main.ts
    
    if (!rawBody) {
      throw new Error('Raw body is missing for stripe webhook');
    }

    await this.billingService.handleWebhook(rawBody, signature);
    return { received: true };
  }

  @Get('portal')
  @UseGuards(JwtAuthGuard)
  async createPortal(@CurrentUser() user: any) {
    const userId = user?.sub || user?.id;
    return this.billingService.createPortalSession(userId);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser() user: any) {
    const userId = user?.sub || user?.id;
    return this.billingService.getStatus(userId);
  }
}
