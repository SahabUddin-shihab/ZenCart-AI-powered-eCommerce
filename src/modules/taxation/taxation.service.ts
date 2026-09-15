import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class TaxationService {
  constructor(private prisma: PrismaService) {}

  async calculateTax(amount: number, country: string, categorySlug?: string) {
    const rules = await this.prisma.taxRule.findMany({
      where: {
        country,
        isActive: true,
        OR: [{ category: null }, { category: categorySlug }],
      },
      orderBy: { priority: 'asc' },
    });

    let totalTax = 0;
    const breakdown: { name: string; rate: number; amount: number }[] = [];

    for (const rule of rules) {
      const taxAmount = (amount * Number(rule.rate)) / 100;
      totalTax += taxAmount;
      breakdown.push({ name: rule.name, rate: Number(rule.rate), amount: taxAmount });
    }

    return { amount, totalTax, breakdown, totalWithTax: amount + totalTax };
  }

  async getRules(country?: string) {
    return this.prisma.taxRule.findMany({
      where: { isActive: true, ...(country && { country }) },
      orderBy: { priority: 'asc' },
    });
  }

  async createRule(data: any) { return this.prisma.taxRule.create({ data }); }
  async updateRule(id: string, data: any) { return this.prisma.taxRule.update({ where: { id }, data }); }
  async deleteRule(id: string) { await this.prisma.taxRule.delete({ where: { id } }); return { message: 'Deleted' }; }

  async findAll(dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.taxRule.findMany({ skip: dto.skip, take: dto.take }),
      this.prisma.taxRule.count(),
    ]);
    return paginate(data, total, dto);
  }

  async create(data: any) { return this.createRule(data); }
  async findById(id: string) { return this.prisma.taxRule.findUnique({ where: { id } }); }
  async update(id: string, data: any) { return this.updateRule(id, data); }
  async delete(id: string) { return this.deleteRule(id); }
  async getStats() { return { total: await this.prisma.taxRule.count(), active: await this.prisma.taxRule.count({ where: { isActive: true } }) }; }
}
