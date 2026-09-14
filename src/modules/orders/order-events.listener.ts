import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { OrderPlacedEvent, OrderDeliveredEvent } from '../../shared/events/order.events';

@Injectable()
export class OrderEventsListener {
  constructor(private prisma: PrismaService) {}

  @OnEvent('order.placed')
  async handleOrderPlaced(event: OrderPlacedEvent) {
    // Update sold counts
    for (const item of event.items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { soldCount: { increment: item.quantity } },
      });
    }
    // Update vendor stats
    const vendorIds = [...new Set(event.items.map((i: any) => i.vendorId))];
    for (const vendorId of vendorIds) {
      await this.prisma.vendor.update({
        where: { id: vendorId as string },
        data: { totalOrders: { increment: 1 } },
      });
    }
    // Award loyalty points (1 point per 10 BDT)
    const points = Math.floor(event.total / 10);
    if (points > 0) {
      await this.prisma.loyaltyPoint.create({
        data: {
          userId: event.userId,
          points,
          type: 'EARNED',
          description: `Order #${event.orderId}`,
          orderId: event.orderId,
        },
      });
    }
  }

  @OnEvent('order.statusChanged')
  async handleStatusChanged(event: any) {
    if (event.newStatus === 'DELIVERED') {
      // Update vendor revenue
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        include: { items: true },
      });
      if (!order) return;
      const vendorRevenues = new Map<string, number>();
      for (const item of order.items) {
        const current = vendorRevenues.get(item.vendorId) || 0;
        vendorRevenues.set(item.vendorId, current + Number(item.totalPrice) - Number(item.commission));
      }
      for (const [vendorId, revenue] of vendorRevenues) {
        await this.prisma.vendor.update({
          where: { id: vendorId },
          data: { totalRevenue: { increment: revenue } },
        });
      }
      // Update commissions to SETTLED
      await this.prisma.commission.updateMany({
        where: { orderId: event.orderId, status: 'PENDING' },
        data: { status: 'SETTLED', settledAt: new Date() },
      });
    }
  }
}
