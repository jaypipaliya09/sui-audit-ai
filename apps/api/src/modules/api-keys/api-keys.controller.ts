import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PlanGuard } from '../../common/guards/plan.guard.js';

@Controller('api-keys')
@UseGuards(JwtAuthGuard, new PlanGuard(['TEAM', 'ENTERPRISE']))
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() body: { name: string; scopes?: string[] }) {
    const { rawKey, apiKey } = await this.apiKeysService.createKey(
      user.userId,
      body.name,
      body.scopes || [],
    );

    return {
      message: 'API Key created successfully. Please save it now, you will not be able to see it again.',
      rawKey,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
      },
    };
  }

  @Get()
  async list(@CurrentUser() user: any) {
    return this.apiKeysService.listKeys(user.userId);
  }

  @Delete(':id')
  async revoke(@CurrentUser() user: any, @Param('id') id: string) {
    await this.apiKeysService.revokeKey(id, user.userId);
    return { message: 'API Key revoked successfully' };
  }
}
