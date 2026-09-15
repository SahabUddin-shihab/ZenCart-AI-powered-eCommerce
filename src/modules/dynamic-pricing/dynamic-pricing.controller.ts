import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DynamicPricingService } from './dynamic-pricing.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('DynamicPricing')
@Controller({ path: 'dynamic-pricing', version: '1' })
export class DynamicPricingController {
  constructor(private readonly service: DynamicPricingService) {}

  @Public()
  @Get('price/:productId')
  @ApiOperation({ summary: 'Get adjusted price for a product' })
  getPrice(@Param('productId') id: string) { return this.service.getAdjustedPrice(id); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('price/:productId/personal')
  @ApiOperation({ summary: 'Get personalized price' })
  getPersonalPrice(@Param('productId') id: string, @CurrentUser('id') userId: string) {
    return this.service.getAdjustedPrice(id, userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VENDOR')
  @Get('suggest/:productId')
  @ApiOperation({ summary: 'AI suggest optimal price' })
  suggestPrice(@Param('productId') id: string) { return this.service.suggestOptimalPrice(id); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Post('flash-sale')
  @ApiOperation({ summary: 'Create flash sale' })
  createFlashSale(@Body() dto: any) { return this.service.applyFlashSale(dto); }
}
