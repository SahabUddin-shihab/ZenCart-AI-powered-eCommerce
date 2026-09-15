import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PathaoService } from './providers/pathao.service';
import { SteadFastService } from './providers/steadfast.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private prisma: PrismaService,
    private pathao: PathaoService,
    private steadfast: SteadFastService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getRates(fromCity: string, toCity: string, weight: number) {
    const [pathaoRates, steadfastRates] = await Promise.allSettled([
      this.pathao.getRates(fromCity, toCity, weight),
      this.steadfast.getRate(weight),
    ]);

    const rates: any[] = [];

    if (pathaoRates.status === 'fulfilled') {
      rates.push({ courier: 'PATHAO', ...pathaoRates.value });
    }
    if (steadfastRates.status === 'fulfilled') {
      rates.push({ courier: 'STEADFAST', ...steadfastRates.value });
    }

    // Add standard shipping
    rates.push({
      courier: 'STANDARD',
      name: 'Standard Delivery',
      cost: weight > 1 ? 100 + (weight - 1) * 30 : 60,
      estimatedDays: '3-5',
    });

    return rates;
  }

  async createShipment(orderId: string, courier: string, toAddress: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { select: { name: true, weight: true } } } },
        user: { select: { firstName: true, lastName: true, phone: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const totalWeight = order.items.reduce((s, i) => s + (i.product.weight || 0.5) * i.quantity, 0);
    let trackingData: any = {};

    try {
      if (courier === 'PATHAO') {
        trackingData = await this.pathao.createOrder({
          orderId,
          recipientName: `${order.user.firstName} ${order.user.lastName}`,
          recipientPhone: order.user.phone || '',
          recipientAddress: toAddress.addressLine1,
          recipientCity: toAddress.city,
          weight: totalWeight,
          amount: Number(order.total),
          itemDescription: order.items.map(i => i.name).join(', '),
        });
      } else if (courier === 'STEADFAST') {
        trackingData = await this.steadfast.createOrder({
          invoiceId: order.orderNumber,
          recipientName: `${order.user.firstName} ${order.user.lastName}`,
          recipientPhone: order.user.phone || '',
          recipientAddress: toAddress.addressLine1,
          codAmount: order.paymentStatus !== 'COMPLETED' ? Number(order.total) : 0,
        });
      }
    } catch (e) {
      this.logger.error(`Shipment creation failed for ${courier}`, e.message);
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        orderId,
        courier,
        trackingNumber: trackingData.trackingCode || trackingData.consignment_id || `TRK-${Date.now()}`,
        status: 'PENDING',
        toAddress,
        weight: totalWeight,
        cost: trackingData.cost || 60,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        metadata: trackingData,
      },
    });

    await this.prisma.order.update({ where: { id: orderId }, data: { status: 'SHIPPED', shippedAt: new Date() } });
    this.eventEmitter.emit('order.statusChanged', { orderId, oldStatus: 'PROCESSING', newStatus: 'SHIPPED', userId: order.userId });

    return shipment;
  }

  async trackShipment(trackingNumber: string, courier: string) {
    try {
      if (courier === 'PATHAO') return this.pathao.trackOrder(trackingNumber);
      if (courier === 'STEADFAST') return this.steadfast.trackOrder(trackingNumber);
    } catch (e) {
      this.logger.warn(`Tracking failed for ${trackingNumber}`);
    }
    return { trackingNumber, status: 'IN_TRANSIT', message: 'Tracking info unavailable' };
  }

  async getOrderShipments(orderId: string) {
    return this.prisma.shipment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }

  async updateShipmentStatus(shipmentId: string, status: string) {
    const shipment = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: status as any,
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
      },
    });

    if (status === 'DELIVERED') {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });
      const order = await this.prisma.order.findUnique({ where: { id: shipment.orderId } });
      if (order) {
        this.eventEmitter.emit('order.statusChanged', {
          orderId: shipment.orderId, oldStatus: 'SHIPPED', newStatus: 'DELIVERED', userId: order.userId,
        });
      }
    }

    return shipment;
  }
}
