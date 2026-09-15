import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AiService } from './ai.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(
    private ai: AiService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateDailyInsights() {
    this.logger.log('Generating daily AI insights...');
    await Promise.all([
      this.generateSalesInsights(),
      this.generateChurnPredictions(),
      this.generateTrendInsights(),
    ]);
  }

  async generateSalesInsights() {
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [currentRevenue, prevRevenue, topProducts, cartAbandonment] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: 'DELIVERED', createdAt: { gte: last30 } },
        _sum: { total: true }, _count: true,
      }),
      this.prisma.order.aggregate({
        where: { status: 'DELIVERED', createdAt: { gte: prev30, lte: last30 } },
        _sum: { total: true }, _count: true,
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 5,
      }),
      this.prisma.cart.count({ where: { items: { some: {} }, updatedAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);

    const revenueGrowth = Number(prevRevenue._sum.total) > 0
      ? ((Number(currentRevenue._sum.total) - Number(prevRevenue._sum.total)) / Number(prevRevenue._sum.total)) * 100
      : 0;

    const prompt = `Analyze this eCommerce data and generate 3-5 actionable business insights:

Revenue (last 30 days): ${currentRevenue._sum.total} BDT (${revenueGrowth.toFixed(1)}% vs prev period)
Orders (last 30 days): ${currentRevenue._count}
Abandoned carts: ${cartAbandonment}

Generate JSON array of insights:
[{ "type": "REVENUE"|"PRODUCT"|"CUSTOMER"|"MARKETING", "text": "insight text", "confidence": 0-1, "suggestedAction": {"title": "...", "description": "..."} }]

Be specific with numbers. Respond ONLY with valid JSON array.`;

    const result = await this.ai.complete(
      [{ role: 'system', content: 'You are an AI analytics expert for a cosmetics eCommerce platform.' },
       { role: 'user', content: prompt }],
      { maxTokens: 1000, temperature: 0.6, jsonMode: true },
    );

    try {
      const insights = JSON.parse(result);
      if (Array.isArray(insights)) {
        for (const insight of insights) {
          await this.prisma.aiInsight.create({
            data: {
              type: insight.type || 'GENERAL',
              insightText: insight.text,
              confidence: insight.confidence,
              suggestedAction: insight.suggestedAction,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
    } catch (e) {
      this.logger.error('Failed to parse AI insights', e.message);
    }
  }

  async generateChurnPredictions() {
    const atRiskUsers = await this.prisma.crmProfile.findMany({
      where: {
        totalOrders: { gte: 2 },
        lastPurchaseAt: { lte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
      },
      take: 100,
    });

    for (const profile of atRiskUsers) {
      const daysSince = profile.lastPurchaseAt
        ? Math.floor((Date.now() - profile.lastPurchaseAt.getTime()) / 86400000)
        : 999;

      const churnScore = Math.min(0.99, daysSince / 180);
      await this.prisma.crmProfile.update({
        where: { id: profile.id },
        data: { churnScore },
      });

      if (churnScore > 0.7) {
        await this.prisma.aiInsight.create({
          data: {
            userId: profile.userId,
            type: 'CHURN_RISK',
            insightText: `Customer hasn't purchased in ${daysSince} days — churn probability ${(churnScore * 100).toFixed(0)}%`,
            confidence: churnScore,
            suggestedAction: {
              title: 'Send win-back campaign',
              description: 'Send personalized discount offer to re-engage this customer',
            } as any,
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

  async generateTrendInsights() {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const topCategories = await this.prisma.productCategory.groupBy({
      by: ['categoryId'],
      where: { product: { orderItems: { some: { createdAt: { gte: last7Days } } } } },
      _count: true,
      orderBy: { _count: { categoryId: 'desc' } },
      take: 3,
    });

    for (const cat of topCategories) {
      const category = await this.prisma.category.findUnique({ where: { id: cat.categoryId } });
      if (category) {
        await this.prisma.aiInsight.upsert({
          where: { id: `trend_${cat.categoryId}` as any },
          create: {
            id: `trend_${cat.categoryId}`,
            type: 'TREND',
            entityType: 'CATEGORY',
            entityId: cat.categoryId,
            insightText: `${category.name} category is trending with ${cat._count} orders in the last 7 days`,
            confidence: 0.8,
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
          update: {
            insightText: `${category.name} category is trending with ${cat._count} orders in the last 7 days`,
          },
        });
      }
    }
  }

  async getInsights(filters?: { userId?: string; vendorId?: string; type?: string }) {
    return this.prisma.aiInsight.findMany({
      where: {
        ...filters,
        isAcknowledged: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });
  }

  async analyzeDiscountEffectiveness(couponCode: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: couponCode },
      include: { usages: true },
    });
    if (!coupon) throw new Error('Coupon not found');

    const usageCount = coupon.usages.length;
    const orderIds = coupon.usages.map(u => u.orderId).filter(Boolean);

    const revenue = await this.prisma.order.aggregate({
      where: { id: { in: orderIds as string[] } },
      _sum: { total: true },
      _avg: { total: true },
    });

    const prompt = `Analyze this discount campaign performance:
Coupon Code: ${couponCode}
Type: ${coupon.type}
Discount Value: ${coupon.discountValue}
Total Usages: ${usageCount}
Total Revenue Generated: ${revenue._sum.total} BDT
Average Order Value: ${revenue._avg.total} BDT

Provide an analysis with:
1. Effectiveness score (0-10)
2. Key findings
3. Recommendations for next campaign

Respond as JSON: { "score": number, "findings": string[], "recommendations": string[] }`;

    const result = await this.ai.complete(
      [{ role: 'user', content: prompt }],
      { maxTokens: 500, temperature: 0.5, jsonMode: true },
    );

    try { return { coupon, metrics: { usageCount, revenue }, analysis: JSON.parse(result) }; }
    catch { return { coupon, metrics: { usageCount, revenue }, analysis: null }; }
  }
}
