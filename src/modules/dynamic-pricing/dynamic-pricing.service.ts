import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private ai: AiService,
  ) {}

  async getAdjustedPrice(productId: string, userId?: string): Promise<{
    originalPrice: number;
    adjustedPrice: number;
    discount: number;
    reason: string;
  }> {
    const cacheKey = `pricing:${productId}:${userId || 'guest'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached as any;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { categories: { include: { category: true } } },
    });
    if (!product) return { originalPrice: 0, adjustedPrice: 0, discount: 0, reason: 'not_found' };

    const originalPrice = Number(product.price);
    let adjustedPrice = originalPrice;
    let reason = 'base_price';

    // Flash sale check
    const flashSale = await this.prisma.flashSale.findFirst({
      where: {
        isActive: true,
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
        productIds: { has: productId },
      },
    });
    if (flashSale) {
      adjustedPrice = originalPrice * (1 - Number(flashSale.discount) / 100);
      reason = 'flash_sale';
    }

    // User segment pricing
    if (userId) {
      const crm = await this.prisma.crmProfile.findUnique({ where: { userId } });
      if (crm?.segment === 'VIP') {
        adjustedPrice = adjustedPrice * 0.95; // 5% VIP discount
        reason = reason === 'base_price' ? 'vip_discount' : `${reason}+vip`;
      }
    }

    const result = {
      originalPrice,
      adjustedPrice: Math.round(adjustedPrice * 100) / 100,
      discount: originalPrice - adjustedPrice,
      reason,
    };

    await this.redis.set(cacheKey, result, 300);
    return result;
  }

  async suggestOptimalPrice(productId: string): Promise<{
    currentPrice: number;
    suggestedPrice: number;
    expectedRevenueLift: string;
    reasoning: string;
  }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { categories: { include: { category: true } } },
    });
    if (!product) throw new Error('Product not found');

    const [salesData, competitorAvg] = await Promise.all([
      this.prisma.orderItem.aggregate({
        where: { productId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        _sum: { quantity: true, totalPrice: true },
        _count: true,
      }),
      this.prisma.product.aggregate({
        where: {
          categories: { some: { category: { products: { some: { productId } } } } },
          id: { not: productId },
          status: 'ACTIVE',
        },
        _avg: { price: true },
      }),
    ]);

    const prompt = `Suggest optimal pricing for this cosmetics product:
Product: ${product.name}
Current Price: ${product.price} BDT
Sales last 30 days: ${salesData._count} orders, ${salesData._sum.quantity} units
Revenue last 30 days: ${salesData._sum.totalPrice} BDT
Category avg price: ${competitorAvg._avg.price} BDT
Product rating: ${product.rating}/5

Suggest an optimal price. Respond ONLY with JSON:
{ "suggestedPrice": number, "expectedRevenueLift": "string", "reasoning": "string" }`;

    const result = await this.ai.complete([{ role: 'user', content: prompt }], {
      maxTokens: 300, temperature: 0.4, jsonMode: true,
    });

    try {
      const parsed = JSON.parse(result);
      return { currentPrice: Number(product.price), ...parsed };
    } catch {
      return {
        currentPrice: Number(product.price),
        suggestedPrice: Number(product.price),
        expectedRevenueLift: '0%',
        reasoning: 'Unable to generate suggestion',
      };
    }
  }

  async applyFlashSale(dto: {
    name: string;
    productIds: string[];
    discount: number;
    startAt: Date;
    endAt: Date;
  }) {
    return this.prisma.flashSale.create({ data: dto as any });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expireFlashSales() {
    await this.prisma.flashSale.updateMany({
      where: { endAt: { lt: new Date() }, isActive: true },
      data: { isActive: false },
    });
  }

  async findAll(dto: any) { return { data: [], meta: { total: 0 } }; }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() { return {}; }
}
