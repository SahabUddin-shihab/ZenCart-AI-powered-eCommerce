import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class VendorAnalyticsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getDashboardStats(vendorId: string) {
    const cacheKey = `vendor:analytics:${vendorId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalOrders, thisMonthOrders, prevMonthOrders,
      totalRevenue, thisMonthRevenue,
      pendingPayouts, totalProducts, lowStockProducts,
    ] = await Promise.all([
      this.prisma.orderItem.count({ where: { vendorId } }),
      this.prisma.orderItem.count({
        where: { vendorId, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.orderItem.count({
        where: { vendorId, createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
      }),
      this.prisma.orderItem.aggregate({
        where: { vendorId },
        _sum: { totalPrice: true },
      }),
      this.prisma.orderItem.aggregate({
        where: { vendorId, createdAt: { gte: startOfMonth } },
        _sum: { totalPrice: true },
      }),
      this.prisma.commission.aggregate({
        where: { vendorId, status: 'PENDING' },
        _sum: { amount: true },
      }),
      this.prisma.product.count({ where: { vendorId, status: 'ACTIVE' } }),
      this.prisma.inventory.count({ where: { product: { vendorId }, quantity: { lte: 5 } } }),
    ]);

    const orderGrowth = prevMonthOrders > 0
      ? ((thisMonthOrders - prevMonthOrders) / prevMonthOrders) * 100
      : 100;

    const stats = {
      orders: { total: totalOrders, thisMonth: thisMonthOrders, growth: orderGrowth.toFixed(1) },
      revenue: {
        total: totalRevenue._sum.totalPrice || 0,
        thisMonth: thisMonthRevenue._sum.totalPrice || 0,
      },
      payouts: { pending: pendingPayouts._sum.amount || 0 },
      products: { active: totalProducts, lowStock: lowStockProducts },
    };

    await this.redis.set(cacheKey, stats, 300);
    return stats;
  }

  async getSalesChart(vendorId: string, period: 'week' | 'month' | 'year' = 'month') {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.orderItem.findMany({
      where: { vendorId, createdAt: { gte: startDate } },
      select: { totalPrice: true, createdAt: true },
    });

    // Group by date
    const grouped: Record<string, number> = {};
    for (const item of orders) {
      const date = item.createdAt.toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + Number(item.totalPrice);
    }

    return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
  }

  async getTopProducts(vendorId: string, limit = 10) {
    const items = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { vendorId },
      _sum: { quantity: true, totalPrice: true },
      _count: true,
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit,
    });

    const productIds = items.map(i => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, images: true, price: true },
    });

    return items.map(item => ({
      product: products.find(p => p.id === item.productId),
      totalSold: item._sum.quantity,
      totalRevenue: item._sum.totalPrice,
      orderCount: item._count,
    }));
  }
}
