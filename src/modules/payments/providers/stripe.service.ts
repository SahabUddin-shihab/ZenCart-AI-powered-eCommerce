import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private config: ConfigService) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY', ''), { apiVersion: '2023-10-16' as any });
  }

  async createPaymentIntent(orderId: string, amount: number, customerEmail: string) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: 'usd',
      metadata: { orderId },
      receipt_email: customerEmail,
    });
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      publishableKey: this.config.get('STRIPE_PUBLISHABLE_KEY'),
    };
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async refund(paymentIntentId: string, amount?: number) {
    const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
    if (amount) params.amount = Math.round(amount * 100);
    return this.stripe.refunds.create(params);
  }

  async constructWebhookEvent(payload: Buffer, signature: string) {
    return this.stripe.webhooks.constructEvent(
      payload, signature, this.config.get('STRIPE_WEBHOOK_SECRET', ''),
    );
  }
}
