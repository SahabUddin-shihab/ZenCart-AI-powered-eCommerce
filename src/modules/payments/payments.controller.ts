import {
  Controller, Post, Body, Param, Get, UseGuards, RawBodyRequest, Req, Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { StripeService } from './providers/stripe.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('initiate/:orderId')
  @ApiOperation({ summary: 'Initiate payment for an order' })
  initiatePayment(
    @Param('orderId') orderId: string,
    @Body('method') method: string,
    @Body('returnUrl') returnUrl?: string,
  ) {
    return this.paymentsService.initiatePayment(orderId, method, returnUrl);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('stripe/confirm')
  @ApiOperation({ summary: 'Confirm Stripe payment' })
  confirmStripe(@Body('paymentIntentId') piId: string, @Body('orderId') orderId: string) {
    return this.paymentsService.confirmStripePayment(piId, orderId);
  }

  @Public()
  @Post('stripe/webhook')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async stripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
    const event = await this.stripeService.constructWebhookEvent(req.rawBody!, sig);
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as any;
      await this.paymentsService.confirmStripePayment(pi.id, pi.metadata.orderId);
    }
    return { received: true };
  }

  @Public()
  @Post('bkash/callback')
  @ApiOperation({ summary: 'bKash payment callback' })
  bkashCallback(@Body('orderId') orderId: string, @Body('paymentID') paymentId: string) {
    return this.paymentsService.handleBkashCallback(orderId, paymentId);
  }

  @Public()
  @Post('sslcommerz/ipn')
  @ApiOperation({ summary: 'SSLCommerz IPN handler' })
  sslCommerzIpn(@Body() data: any) {
    return this.paymentsService.handleSslCommerzCallback(data);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('refund/:orderId')
  @ApiOperation({ summary: 'Process refund (Admin)' })
  refund(
    @Param('orderId') orderId: string,
    @Body('amount') amount: number,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.refund(orderId, amount, reason);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('history/:orderId')
  @ApiOperation({ summary: 'Get payment history for order' })
  getHistory(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentHistory(orderId);
  }
}
