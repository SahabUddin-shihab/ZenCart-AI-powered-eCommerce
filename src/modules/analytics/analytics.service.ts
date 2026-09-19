import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getAdminDashboard() {
    const cacheKey = 'analytics:admin:dashboard';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers, newUsersToday, totalOrders, todayOrders,
      totalRevenue, monthRevenue, lastMonthRevenue,
      totalVendors, activeVendors, totalProducts, pendingOrders,
      topProducts, recentOrders,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: today } } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'COMPLETED' } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'COMPLETED', createdAt: { gte: thisMonth } } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'COMPLETED', createdAt: { gte: lastMonth, lte: endLastMonth } } }),
      this.prisma.vendor.count(),
      this.prisma.vendor.count({ where: { status: 'APPROVED' } }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { totalPrice: true, quantity: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 5,
        where: { createdAt: { gte: thisMonth } },
      }),
      this.prisma.order.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    const monthGrowth = Number(lastMonthRevenue._sum.total) > 0
      ? ((Number(monthRevenue._sum.total) - Number(lastMonthRevenue._sum.total)) / Number(lastMonthRevenue._sum.total)) * 100
      : 0;

    const dashboard = {
      kpis: {
        totalUsers,
        newUsersToday,
        totalOrders,
        todayOrders,
        totalRevenue: Number(totalRevenue._sum.total || 0),
        monthRevenue: Number(monthRevenue._sum.total || 0),
        monthGrowth: monthGrowth.toFixed(1),
        totalVendors,
        activeVendors,
        totalProducts,
        pendingOrders,
      },
      topProducts,
      recentOrders,
    };

    await this.redis.set(cacheKey, dashboard, 300);
    return dashboard;
  }

  async getRevenueChart(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    const cacheKey = `analytics:revenue:${period}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const days = { day: 1, week: 7, month: 30, year: 365 }[period];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: { paymentStatus: 'COMPLETED', createdAt: { gte: startDate } },
      select: { total: true, createdAt: true },
    });

    const grouped: Record<string, { revenue: number; orders: number }> = {};
    for (const order of orders) {
      const key = period === 'year'
        ? order.createdAt.toISOString().substring(0, 7)
        : order.createdAt.toISOString().split('T')[0];
      if (!grouped[key]) grouped[key] = { revenue: 0, orders: 0 };
      grouped[key].revenue += Number(order.total);
      grouped[key].orders++;
    }

    const chart = Object.entries(grouped).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
    await this.redis.set(cacheKey, chart, 600);
    return chart;
  }

  async getUserGrowthChart(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    });

    const grouped: Record<string, number> = {};
    for (const user of users) {
      const key = user.createdAt.toISOString().split('T')[0];
      grouped[key] = (grouped[key] || 0) + 1;
    }

    return Object.entries(grouped).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getCategoryRevenue() {
    const items = await this.prisma.orderItem.findMany({
      include: { product: { include: { categories: { include: { category: { select: { name: true } } } } } } },
      where: { order: { paymentStatus: 'COMPLETED' } },
    });

    const catRevenue: Record<string, number> = {};
    for (const item of items) {
      const cats = item.product.categories.map((c: any) => c.category.name);
      for (const cat of cats) {
        catRevenue[cat] = (catRevenue[cat] || 0) + Number(item.totalPrice);
      }
    }

    return Object.entries(catRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  async getConversionFunnel() {
    const [sessions, cartCreated, checkoutStarted, orderPlaced] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { eventType: 'page_view' } }),
      this.prisma.cart.count({ where: { items: { some: {} } } }),
      this.prisma.analyticsEvent.count({ where: { eventType: 'checkout_started' } }),
      this.prisma.order.count(),
    ]);

    return [
      { stage: 'Sessions', count: sessions, rate: 100 },
      { stage: 'Added to Cart', count: cartCreated, rate: sessions > 0 ? ((cartCreated / sessions) * 100).toFixed(1) : 0 },
      { stage: 'Checkout Started', count: checkoutStarted, rate: sessions > 0 ? ((checkoutStarted / sessions) * 100).toFixed(1) : 0 },
      { stage: 'Order Placed', count: orderPlaced, rate: sessions > 0 ? ((orderPlaced / sessions) * 100).toFixed(1) : 0 },
    ];
  }

  async trackEvent(event: {
    eventType: string;
    userId?: string;
    sessionId?: string;
    entityType?: string;
    entityId?: string;
    properties?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.analyticsEvent.create({ data: event });
  }

  async getTopVendors(limit = 10) {
    return this.prisma.vendor.findMany({
      where: { status: 'APPROVED' },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
      select: {
        id: true, storeName: true, totalRevenue: true, totalOrders: true, rating: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async getCohortAnalysis() {
    // Simplified cohort: users by registration month and their orders
    const cohorts = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE_TRUNC('month', u.created_at) as cohort_month,
        COUNT(DISTINCT u.id) as users,
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(o.total), 0) as revenue
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.payment_status = 'COMPLETED'
      WHERE u.role = 'CUSTOMER'
      GROUP BY cohort_month
      ORDER BY cohort_month DESC
      LIMIT 12
    `;
    return cohorts;
  }
}
