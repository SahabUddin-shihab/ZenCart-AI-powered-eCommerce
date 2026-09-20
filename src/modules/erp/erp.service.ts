import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class ErpService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalRevenue, monthRevenue, totalCommissions, pendingPayouts,
      totalVendors, totalProducts, totalOrders, pendingOrders,
      lowStockCount, openTickets,
    ] = await Promise.all([
      this.prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'COMPLETED' } }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'COMPLETED', createdAt: { gte: thisMonth } } }),
      this.prisma.commission.aggregate({ _sum: { amount: true } }),
      this.prisma.commission.aggregate({ _sum: { amount: true }, where: { status: 'PENDING' } }),
      this.prisma.vendor.count({ where: { status: 'APPROVED' } }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.inventory.count({ where: { quantity: { lte: 5 } } }),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    ]);

    return {
      financial: {
        totalRevenue: Number(totalRevenue._sum.total || 0),
        monthRevenue: Number(monthRevenue._sum.total || 0),
        totalCommissions: Number(totalCommissions._sum.amount || 0),
        pendingPayouts: Number(pendingPayouts._sum.amount || 0),
      },
      operations: { totalVendors, totalProducts, totalOrders, pendingOrders },
      alerts: { lowStockCount, openTickets },
    };
  }

  async getSystemHealth() {
    const [dbCheck, recentErrors] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1 as ok`.then(() => true).catch(() => false),
      this.prisma.auditLog.count({
        where: { action: 'DELETE', createdAt: { gte: new Date(Date.now() - 3600000) } },
      }),
    ]);
    return {
      database: dbCheck ? 'healthy' : 'degraded',
      recentDeletions: recentErrors,
      timestamp: new Date(),
    };
  }

  async findAll(dto: PaginationDto) { return paginate([], 0, dto); }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() { return this.getDashboard(); }
}
