import {
  Controller, Post, Get, Body, Query, UseGuards, Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Checkout')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'checkout', version: '1' })
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('summary')
  @ApiOperation({ summary: 'Get checkout summary with shipping + tax + discounts' })
  getSummary(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.checkoutService.summarize(userId, dto);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate cart before checkout' })
  validate(@CurrentUser('id') userId: string, @Ip() ip: string) {
    return this.checkoutService.validateAndPreCheck(userId, ip);
  }
}
