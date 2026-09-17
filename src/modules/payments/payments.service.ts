import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StripeService } from './providers/stripe.service';
import { BkashService } from './providers/bkash.service';
import { SslCommerzService } from './providers/sslcommerz.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private bkashService: BkashService,
    private sslCommerzService: SslCommerzService,
    private eventEmitter: EventEmitter2,
  ) {}

  async initiatePayment(orderId: string, method: string, returnUrl?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === 'COMPLETED') throw new BadRequestException('Order already paid');

    const amount = Number(order.total);

    switch (method) {
      case 'STRIPE':
        return this.stripeService.createPaymentIntent(orderId, amount, order.user.email);

      case 'BKASH':
        return this.bkashService.createPayment(orderId, amount, returnUrl!);

      case 'SSLCOMMERZ':
        return this.sslCommerzService.initiateSession(orderId, amount, order.user, returnUrl!);

      case 'COD':
        await this.prisma.payment.create({
          data: { orderId, method: 'COD', status: 'PENDING', amount },
        });
        return { method: 'COD', message: 'Cash on delivery selected', orderId };

      default:
        throw new BadRequestException(`Payment method ${method} not supported`);
    }
  }

  async confirmStripePayment(paymentIntentId: string, orderId: string) {
    const intent = await this.stripeService.retrievePaymentIntent(paymentIntentId);
    if (intent.status !== 'succeeded') throw new BadRequestException('Payment not confirmed');
    return this.markPaid(orderId, 'STRIPE', paymentIntentId, { intent });
  }

  async handleBkashCallback(orderId: string, paymentId: string) {
    const result = await this.bkashService.executePayment(paymentId);
    if (result.transactionStatus === 'Completed') {
      return this.markPaid(orderId, 'BKASH', result.trxID, result);
    }
    throw new BadRequestException('bKash payment failed');
  }

  async handleSslCommerzCallback(data: any) {
    const isValid = await this.sslCommerzService.validateIpn(data);
    if (!isValid || data.status !== 'VALID') throw new BadRequestException('SSLCommerz IPN invalid');
    return this.markPaid(data.value_a, 'SSLCOMMERZ', data.bank_tran_id, data);
  }

  async markPaid(orderId: string, method: string, gatewayRef: string, gatewayResponse?: any) {
    const [payment, order] = await Promise.all([
      this.prisma.payment.upsert({
        where: { id: `${orderId}_${method}` },
        create: {
          orderId, method: method as any, status: 'COMPLETED',
          amount: (await this.prisma.order.findUnique({ where: { id: orderId } }))?.total || 0,
          gatewayRef, gatewayResponse, paidAt: new Date(),
        },
        update: { status: 'COMPLETED', gatewayRef, gatewayResponse, paidAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'COMPLETED', status: 'CONFIRMED', confirmedAt: new Date() },
      }),
    ]);

    this.eventEmitter.emit('payment.completed', { orderId, method, amount: Number(order.total) });
    this.logger.log(`Payment confirmed: ${orderId} via ${method}`);
    return { payment, order };
  }

  async refund(orderId: string, amount: number, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { where: { status: 'COMPLETED' } } },
    });
    if (!order || !order.payments.length) throw new NotFoundException('No completed payment found');

    const payment = order.payments[0];
    let gatewayRefund: any = null;

    if (payment.method === 'STRIPE' && payment.gatewayRef) {
      gatewayRefund = await this.stripeService.refund(payment.gatewayRef, amount);
    }

    await Promise.all([
      this.prisma.refund.create({
        data: { orderId, amount, reason, status: 'PROCESSED', processedAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'REFUNDED', status: 'REFUNDED' },
      }),
    ]);

    this.eventEmitter.emit('payment.refunded', { orderId, amount, reason });
    return { message: 'Refund processed', amount, gatewayRefund };
  }

  async getPaymentHistory(orderId: string) {
    return this.prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }
}
