import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class AbTestingService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getVariant(experimentKey: string, userId: string): Promise<string> {
    const cacheKey = `abtest:${experimentKey}:${userId}`;
    const cached = await this.redis.get<string>(cacheKey);
    if (cached) return cached;
    const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const variant = hash % 100 < 50 ? 'control' : 'variant';
    await this.redis.set(cacheKey, variant, 86400);
    return variant;
  }

  async trackConversion(experimentKey: string, userId: string, variant: string, value?: number) {
    await this.prisma.analyticsEvent.create({
      data: { eventType: 'abtest_conversion', userId, properties: { experimentKey, variant, value } as any },
    });
  }

  async getResults(experimentKey: string) {
    const events = await this.prisma.analyticsEvent.findMany({
      where: { eventType: 'abtest_conversion', properties: { path: ['experimentKey'], equals: experimentKey } },
    });
    const control = events.filter((e: any) => (e.properties as any)?.variant === 'control');
    const variant = events.filter((e: any) => (e.properties as any)?.variant === 'variant');
    return { experimentKey, control: { count: control.length }, variant: { count: variant.length }, winner: variant.length > control.length ? 'variant' : 'control' };
  }

  async findAll(dto: PaginationDto) { return paginate([], 0, dto); }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() { return {}; }
}
