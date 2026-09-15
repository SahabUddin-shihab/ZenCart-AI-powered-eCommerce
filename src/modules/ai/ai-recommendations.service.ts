import { Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class AiRecommendationsService {
  constructor(
    private ai: AiService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getPersonalized(userId: string, limit = 12): Promise<any[]> {
    const cacheKey = `recommendations:personalized:${userId}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { skinType: true, skinConcerns: true, preferredShades: true },
    });

    const recentOrders = await this.prisma.orderItem.findMany({
      where: { order: { userId } },
      select: { productId: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const purchasedIds = recentOrders.map(o => o.productId);

    const candidates = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        id: { notIn: purchasedIds },
        ...(user?.skinType && { skinTypes: { has: user.skinType } }),
      },
      orderBy: [{ rating: 'desc' }, { soldCount: 'desc' }],
      take: limit,
      include: { vendor: { select: { storeName: true } } },
    });

    await this.redis.set(cacheKey, candidates, 1800);
    return candidates;
  }

  async getSimilar(productId: string, limit = 8): Promise<any[]> {
    const cacheKey = `recommendations:similar:${productId}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { categories: true },
    });
    if (!product) return [];

    const categoryIds = product.categories.map(c => c.categoryId);

    const similar = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: productId },
        categories: { some: { categoryId: { in: categoryIds } } },
      },
      orderBy: [{ rating: 'desc' }, { soldCount: 'desc' }],
      take: limit,
    });

    await this.redis.set(cacheKey, similar, 3600);
    return similar;
  }

  async getFrequentlyBoughtTogether(productId: string, limit = 4): Promise<any[]> {
    const cacheKey = `recommendations:fbt:${productId}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    // Find orders containing this product
    const coOrders = await this.prisma.orderItem.findMany({
      where: { order: { items: { some: { productId } } }, productId: { not: productId } },
      select: { productId: true },
      take: 100,
    });

    // Count frequency
    const freq = new Map<string, number>();
    for (const item of coOrders) {
      freq.set(item.productId, (freq.get(item.productId) || 0) + 1);
    }

    const topIds = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    const products = await this.prisma.product.findMany({
      where: { id: { in: topIds }, status: 'ACTIVE' },
    });

    await this.redis.set(cacheKey, products, 3600);
    return products;
  }

  async getUpsell(productId: string): Promise<any[]> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return [];

    return this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        categories: { some: { category: { products: { some: { productId } } } } },
        price: { gt: product.price },
        id: { not: productId },
      },
      orderBy: { rating: 'desc' },
      take: 4,
    });
  }

  async getTrending(categoryId?: string, limit = 12): Promise<any[]> {
    const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const where: any = { status: 'ACTIVE', orderItems: { some: { createdAt: { gte: last7 } } } };
    if (categoryId) where.categories = { some: { categoryId } };

    return this.prisma.product.findMany({
      where,
      orderBy: [{ soldCount: 'desc' }, { viewCount: 'desc' }],
      take: limit,
      include: { vendor: { select: { storeName: true } } },
    });
  }
}
