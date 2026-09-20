import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class CommissionsService {
  constructor(private prisma: PrismaService) {}

  async getVendorCommissions(vendorId: string, dto: PaginationDto & { status?: string }) {
    const where: any = { vendorId };
    if (dto.status) where.status = dto.status;

    const [data, total] = await Promise.all([
      this.prisma.commission.findMany({
        where, skip: dto.skip, take: dto.take, orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true, total: true } } },
      }),
      this.prisma.commission.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async getVendorSummary(vendorId: string) {
    const [total, pending, settled] = await Promise.all([
      this.prisma.commission.aggregate({ where: { vendorId }, _sum: { amount: true } }),
      this.prisma.commission.aggregate({ where: { vendorId, status: 'PENDING' }, _sum: { amount: true } }),
      this.prisma.commission.aggregate({ where: { vendorId, status: 'SETTLED' }, _sum: { amount: true } }),
    ]);
    return {
      total: Number(total._sum.amount || 0),
      pending: Number(pending._sum.amount || 0),
      settled: Number(settled._sum.amount || 0),
    };
  }

  async calculateForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { vendor: true, product: { include: { categories: true } } } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const commissions: any[] = [];
    for (const item of order.items) {
      const vendorConfig = item.vendor.commissionConfig as any || {};
      let rate = vendorConfig.rate || 10;
      let type = vendorConfig.type || 'PERCENTAGE';

      // Category-based override
      const categoryIds = item.product.categories.map((c: any) => c.categoryId);
      if (vendorConfig.categoryRates) {
        for (const catId of categoryIds) {
          if (vendorConfig.categoryRates[catId]) {
            rate = vendorConfig.categoryRates[catId];
            break;
          }
        }
      }

      const amount = type === 'PERCENTAGE'
        ? (Number(item.totalPrice) * rate) / 100
        : rate;

      commissions.push({ vendorId: item.vendorId, itemId: item.id, rate, amount, type });
    }
    return commissions;
  }

  async settleCommissions(vendorId: string, payoutId: string) {
    return this.prisma.commission.updateMany({
      where: { vendorId, status: 'PENDING' },
      data: { status: 'SETTLED', settledAt: new Date(), payoutId },
    });
  }

  async getAllStats() {
    const [totalCommissions, pendingCommissions, totalPaid] = await Promise.all([
      this.prisma.commission.aggregate({ _sum: { amount: true } }),
      this.prisma.commission.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
      this.prisma.commission.aggregate({ where: { status: 'SETTLED' }, _sum: { amount: true } }),
    ]);
    return {
      total: Number(totalCommissions._sum.amount || 0),
      pending: Number(pendingCommissions._sum.amount || 0),
      settled: Number(totalPaid._sum.amount || 0),
    };
  }
}
