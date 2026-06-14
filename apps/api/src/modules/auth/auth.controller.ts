import { Controller, Post, Body, Get, Query, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SuiAuthService } from './sui-auth.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly suiAuthService: SuiAuthService,
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(body);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
    return { accessToken, user };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const { accessToken, refreshToken, user } = await this.authService.refresh(token);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
    return { accessToken, user };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 3600_000 } })
  async forgotPassword(@Body('email') email: string) {
    // We would implement this fully in auth.service, for now just returning success
    return { message: 'If that email exists, a password reset link has been sent.' };
  }

  @Get('sui/nonce')
  async getSuiNonce(@Query('address') address: string) {
    const nonce = await this.suiAuthService.generateNonce(address);
    return { nonce };
  }

  @Post('sui/verify')
  async verifySuiSignature(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const { address, signedMessage, signature } = body;
    const user = await this.suiAuthService.verifySuiSignature(address, signedMessage, signature);
    const { accessToken, refreshToken } = await this.authService.generateTokens(user);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
    return { accessToken, user };
  }
}
