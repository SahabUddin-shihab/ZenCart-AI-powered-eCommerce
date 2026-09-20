import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getProfitLoss(startDate: Date, endDate: Date) {
    const [revenue, refunds, commissions] = await Promise.all([
      this.prisma.order.aggregate({
        where: { paymentStatus: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } },
        _sum: { total: true },
      }),
      this.prisma.refund.aggregate({
        where: { status: 'PROCESSED', createdAt: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: { status: 'SETTLED', createdAt: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
    ]);

    const grossRevenue = Number(revenue._sum.total || 0);
    const totalRefunds = Number(refunds._sum.amount || 0);
    const totalCommissions = Number(commissions._sum.amount || 0);
    const netRevenue = grossRevenue - totalRefunds;
    const platformRevenue = netRevenue - totalCommissions;

    return {
      period: { startDate, endDate },
      grossRevenue,
      totalRefunds,
      netRevenue,
      totalCommissions,
      platformRevenue,
      refundRate: grossRevenue > 0 ? ((totalRefunds / grossRevenue) * 100).toFixed(2) : '0',
      commissionRate: netRevenue > 0 ? ((totalCommissions / netRevenue) * 100).toFixed(2) : '0',
    };
  }

  async getVendorPayouts(dto: PaginationDto & { status?: string }) {
    const where: any = {};
    if (dto.status) where.status = dto.status;
    const [data, total] = await Promise.all([
      this.prisma.payout.findMany({
        where, skip: dto.skip, take: dto.take, orderBy: { createdAt: 'desc' },
        include: { vendor: { select: { storeName: true } } },
      }),
      this.prisma.payout.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async createPayout(vendorId: string, method: string, bankDetails?: any) {
    const pending = await this.prisma.commission.aggregate({
      where: { vendorId, status: 'PENDING' },
      _sum: { amount: true },
    });

    const amount = Number(pending._sum.amount || 0);
    if (amount < 500) throw new Error('Minimum payout amount is 500 BDT');

    const payout = await this.prisma.payout.create({
      data: { vendorId, amount, currency: 'BDT', method, bankDetails, status: 'PENDING' },
    });

    await this.prisma.commission.updateMany({
      where: { vendorId, status: 'PENDING' },
      data: { status: 'SETTLED', settledAt: new Date(), payoutId: payout.id },
    });

    return payout;
  }

  async processPayout(payoutId: string, reference: string) {
    return this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'COMPLETED', processedAt: new Date(), reference },
    });
  }

  async getRevenueByVendor(limit = 10) {
    return this.prisma.vendor.findMany({
      where: { status: 'APPROVED' },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
      select: { id: true, storeName: true, totalRevenue: true, totalOrders: true },
    });
  }

  async getTaxReport(startDate: Date, endDate: Date) {
    const taxableOrders = await this.prisma.order.aggregate({
      where: { paymentStatus: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } },
      _sum: { taxAmount: true, total: true },
    });
    return {
      period: { startDate, endDate },
      totalTax: taxableOrders._sum.taxAmount || 0,
      totalRevenue: taxableOrders._sum.total || 0,
    };
  }

  async findAll(dto: PaginationDto) { return paginate([], 0, dto); }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() { return {}; }
}
