import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { EmailService } from './providers/email.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class NotificationEventsListener {
  constructor(
    private notifications: NotificationsService,
    private email: EmailService,
    private prisma: PrismaService,
  ) {}

  @OnEvent('user.registered')
  async handleUserRegistered(event: any) {
    const user = await this.prisma.user.findUnique({ where: { id: event.userId } });
    if (!user) return;
    await this.email.sendWelcome(user.email, user.firstName);
    await this.notifications.send(event.userId, {
      type: 'IN_APP',
      title: 'Welcome to AIeCom! 🎉',
      body: 'Start exploring thousands of beauty products tailored just for you.',
      actionUrl: '/shop',
    });
  }

  @OnEvent('order.placed')
  async handleOrderPlaced(event: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: { user: true },
    });
    if (!order) return;
    await this.email.sendOrderConfirmation(order.user.email, order.user.firstName, order);
    await this.notifications.send(order.userId, {
      type: 'IN_APP',
      title: 'Order Placed Successfully! ✅',
      body: `Your order #${order.orderNumber} has been received.`,
      actionUrl: `/orders/${order.id}`,
    });
  }

  @OnEvent('order.statusChanged')
  async handleOrderStatusChanged(event: any) {
    const statusMessages: Record<string, string> = {
      CONFIRMED: 'Your order has been confirmed and is being prepared.',
      SHIPPED: 'Your order has shipped! Track it in your account.',
      DELIVERED: 'Your order has been delivered! Enjoy your products.',
      CANCELLED: 'Your order has been cancelled.',
    };
    const msg = statusMessages[event.newStatus];
    if (!msg) return;
    await this.notifications.send(event.userId, {
      type: 'IN_APP',
      title: `Order ${event.newStatus}`,
      body: msg,
      actionUrl: `/orders/${event.orderId}`,
    });
  }

  @OnEvent('vendor.approved')
  async handleVendorApproved(event: any) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: event.vendorId },
      include: { user: true },
    });
    if (!vendor) return;
    await this.notifications.send(vendor.userId, {
      type: 'IN_APP',
      title: 'Vendor Account Approved! 🎊',
      body: 'Your vendor application has been approved. Start listing your products!',
      actionUrl: '/vendor/dashboard',
    });
  }
}
