import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
// import { RealtimeGateway } from '../../infrastructure/websocket/realtime.gateway';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { generateOrderNumber } from '../../shared/utils/string.util';
import { OrderPlacedEvent, OrderStatusChangedEvent } from '../../shared/events/order.events';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private eventEmitter: EventEmitter2,
    // private realtimeGateway: RealtimeGateway,
  ) {}

  async createFromCart(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { vendor: true } },
          },
        },
      },
    });

    if (!cart || (cart as any).items?.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of (cart as any).items || []) {
      // Fetch variant price if needed
      let itemPrice = Number(item.price);
      if (item.variantId) {
        const variant = await this.prisma.productVariant.findUnique({ where: { id: item.variantId } });
        if (variant?.price) itemPrice = Number(variant.price);
      }
      const price = itemPrice;
      const total = price * item.quantity;
      subtotal += total;

      // Check inventory
      const inventory = await this.prisma.inventory.findFirst({
        where: { productId: item.productId },
      });
      if (!inventory || inventory.quantity - inventory.reservedQty < item.quantity) {
        throw new BadRequestException(`Insufficient stock for: ${item.product.name}`);
      }

      // Get commission config
      const vendor = item.product.vendor;
      const commissionConfig = vendor.commissionConfig as any;
      const commissionRate = commissionConfig?.rate || 10;
      const commission = (total * commissionRate) / 100;

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId,
        vendorId: item.product.vendorId,
        name: item.product.name,
        sku: item.product.sku,
        image: (item.product.images as any)?.[0]?.url,
        quantity: item.quantity,
        unitPrice: price,
        totalPrice: total,
        commission,
        commissionRate,
        attributes: item.metadata,
      });
    }

    // Apply coupon
    let discountAmount = 0;
    if (cart.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: cart.couponCode } });
      if (coupon && coupon.isActive) {
        discountAmount = Number(cart.discountAmount);
      }
    }

    // Calculate tax
    const taxAmount = subtotal * 0.05; // 5% default; real: use taxation module
    const shippingAmount = dto.shippingAddressId ? 60 : 0; // real: use shipping module
    const total = subtotal - discountAmount + taxAmount + shippingAmount;

    const orderNumber = generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: dto.shippingAddressId,
          subtotal,
          discountAmount,
          shippingAmount,
          taxAmount,
          total,
          paymentMethod: dto.paymentMethod as any,
          couponCode: cart.couponCode,
          couponDiscount: discountAmount,
          notes: dto.notes,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // Reserve inventory
      for (const item of (cart as any).items || []) {
        await tx.inventory.updateMany({
          where: { productId: item.productId },
          data: { reservedQty: { increment: item.quantity } },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { couponCode: null, discountAmount: 0, subtotal: 0, total: 0 },
      });

      // Create commission records
      for (const item of orderItems) {
        await tx.commission.create({
          data: {
            vendorId: item.vendorId,
            orderId: newOrder.id,
            type: 'PERCENTAGE',
            rate: item.commissionRate,
            amount: item.commission,
          },
        });
      }

      // Add status history
      await tx.orderStatusHistory.create({
        data: { orderId: newOrder.id, status: 'PENDING', note: 'Order placed' },
      });

      return newOrder;
    });

    // Emit events
    this.eventEmitter.emit(
      'order.placed',
      new OrderPlacedEvent(order.id, userId, Number(order.total), orderItems),
    );

    // Real-time notification
   // this.realtimeGateway.emit(userId, 'order:placed', { orderId: order.id, orderNumber });

    return order;
  }

  async findAll(dto: PaginationDto & { status?: string; vendorId?: string }) {
    const where: any = {};
    if (dto.status) where.status = dto.status;
    if (dto.vendorId) where.items = { some: { vendorId: dto.vendorId } };
    if (dto.search) where.orderNumber = { contains: dto.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip: dto.skip, take: dto.take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          items: { include: { vendor: { select: { storeName: true } } } },
          shipments: { select: { status: true, trackingNumber: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        address: true,
        items: {
          include: {
            product: { select: { name: true, images: true, slug: true } },
            vendor: { select: { storeName: true, storeSlug: true } },
          },
        },
        payments: true,
        shipments: true,
        refunds: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findByUser(userId: string, dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId }, skip: dto.skip, take: dto.take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: { select: { name: true, images: true } } } },
          shipments: { select: { status: true, trackingNumber: true } },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return paginate(data, total, dto);
  }

  async findByVendor(vendorId: string, dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { items: { some: { vendorId } } },
        skip: dto.skip, take: dto.take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true } },
          items: { where: { vendorId }, include: { product: { select: { name: true, images: true } } } },
          shipments: { select: { status: true, trackingNumber: true } },
        },
      }),
      this.prisma.order.count({ where: { items: { some: { vendorId } } } }),
    ]);
    return paginate(data, total, dto);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, updatedBy?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: dto.status as any,
          ...(dto.status === 'CONFIRMED' && { confirmedAt: new Date() }),
          ...(dto.status === 'SHIPPED' && { shippedAt: new Date() }),
          ...(dto.status === 'DELIVERED' && { deliveredAt: new Date() }),
          ...(dto.status === 'CANCELLED' && { cancelledAt: new Date() }),
        },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: id, status: dto.status as any, note: dto.note, createdBy: updatedBy },
      });

      // Release inventory if cancelled
      if (dto.status === 'CANCELLED') {
        const items = await tx.orderItem.findMany({ where: { orderId: id } });
        for (const item of items) {
          await tx.inventory.updateMany({
            where: { productId: item.productId },
            data: { reservedQty: { decrement: item.quantity } },
          });
        }
      }

      return updatedOrder;
    });

    this.eventEmitter.emit(
      'order.statusChanged',
      new OrderStatusChangedEvent(id, order.status, dto.status, order.userId),
    );
    //this.realtimeGateway.emitToOrder(id, 'order:status', { status: dto.status });
   // this.realtimeGateway.emit(order.userId, 'order:status', { orderId: id, status: dto.status });

    return updated;
  }

  async cancel(id: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Not your order');
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }
    return this.updateStatus(id, { status: 'CANCELLED', note: reason || 'Cancelled by customer' });
  }

  async getStats() {
    const [total, pending, processing, delivered, revenue] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'PROCESSING' } }),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { status: 'DELIVERED' } }),
    ]);
    return { total, pending, processing, delivered, totalRevenue: revenue._sum.total || 0 };
  }
}
