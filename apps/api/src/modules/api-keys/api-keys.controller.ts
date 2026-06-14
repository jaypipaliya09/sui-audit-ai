import { Controller, Post, Get, Delete, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
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
    const userId = user?.sub || user?.id;
    const { rawKey, apiKey } = await this.apiKeysService.createKey(
      userId,
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
    const userId = user?.sub || user?.id;
    return this.apiKeysService.listKeys(userId);
  }

  @Delete(':id')
  async revoke(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = user?.sub || user?.id;
    await this.apiKeysService.revokeKey(id, userId);
    return { message: 'API Key revoked successfully' };
  }
}
