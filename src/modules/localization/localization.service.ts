import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class LocalizationService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getTranslations(locale: string) {
    const cacheKey = `translations:${locale}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const translations = await this.prisma.translation.findMany({ where: { locale } });
    const result = translations.reduce((acc, t) => ({ ...acc, [t.key]: t.value }), {} as Record<string, string>);
    await this.redis.set(cacheKey, result, 3600);
    return result;
  }

  async upsertTranslation(key: string, locale: string, value: string) {
    const result = await this.prisma.translation.upsert({
      where: { key_locale: { key, locale } },
      create: { key, locale, value },
      update: { value },
    });
    await this.redis.del(`translations:${locale}`);
    return result;
  }

  async bulkUpsert(translations: { key: string; locale: string; value: string }[]) {
    const results = await Promise.all(translations.map(t => this.upsertTranslation(t.key, t.locale, t.value)));
    return results;
  }

  async getLanguages() {
    return this.prisma.language.findMany({ where: { isActive: true }, orderBy: { isDefault: 'desc' } });
  }

  async getCurrencies() {
    return this.prisma.currency.findMany({ where: { isActive: true }, orderBy: { isDefault: 'desc' } });
  }

  async convertCurrency(amount: number, from: string, to: string) {
    const [fromCurr, toCurr] = await Promise.all([
      this.prisma.currency.findUnique({ where: { code: from } }),
      this.prisma.currency.findUnique({ where: { code: to } }),
    ]);
    if (!fromCurr || !toCurr) throw new Error('Currency not found');
    const inBase = amount / Number(fromCurr.rate);
    const converted = inBase * Number(toCurr.rate);
    return { amount, from, to, converted: Math.round(converted * 100) / 100, rate: Number(toCurr.rate) / Number(fromCurr.rate) };
  }

  async updateCurrencyRate(code: string, rate: number) {
    const result = await this.prisma.currency.update({ where: { code }, data: { rate } });
    await this.redis.del('currencies');
    return result;
  }

  async findAll(dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.translation.findMany({ skip: dto.skip, take: dto.take }),
      this.prisma.translation.count(),
    ]);
    return paginate(data, total, dto);
  }

  async create(data: any) { return this.upsertTranslation(data.key, data.locale, data.value); }
  async findById(id: string) { return this.prisma.translation.findUnique({ where: { id } }); }
  async update(id: string, data: any) { return this.prisma.translation.update({ where: { id }, data }); }
  async delete(id: string) { await this.prisma.translation.delete({ where: { id } }); return { message: 'Deleted' }; }
  async getStats() { return { total: await this.prisma.translation.count() }; }
}
