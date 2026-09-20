import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Subscriptions')
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Public() @Get('plans') getPlans() { return this.service.getVendorPlans(); }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR')
  @Post('upgrade')
  @ApiOperation({ summary: 'Upgrade vendor subscription' })
  upgrade(@CurrentUser() user: any, @Body('planId') planId: string) {
    return this.service.upgradeVendorPlan(user.vendor.id, planId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR')
  @Delete('cancel')
  cancel(@CurrentUser() user: any) { return this.service.cancelVendorSubscription(user.vendor.id); }
}
