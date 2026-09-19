import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(startDate: Date, endDate: Date, vendorId?: string) {
    const where: any = { createdAt: { gte: startDate, lte: endDate } };
    if (vendorId) where.order = { items: { some: { vendorId } } };

    const [orders, items, topProducts] = await Promise.all([
      this.prisma.order.aggregate({
        where: { paymentStatus: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } },
        _sum: { total: true, discountAmount: true, shippingAmount: true, taxAmount: true },
        _count: true,
        _avg: { total: true },
      }),
      this.prisma.orderItem.aggregate({
        where: { order: { paymentStatus: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } }, ...(vendorId && { vendorId }) },
        _sum: { totalPrice: true, quantity: true },
        _count: true,
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { paymentStatus: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } }, ...(vendorId && { vendorId }) },
        _sum: { totalPrice: true, quantity: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      period: { startDate, endDate },
      orders: {
        total: orders._count,
        revenue: orders._sum.total || 0,
        avgOrderValue: orders._avg.total || 0,
        totalDiscount: orders._sum.discountAmount || 0,
        totalShipping: orders._sum.shippingAmount || 0,
        totalTax: orders._sum.taxAmount || 0,
      },
      items: {
        totalSold: items._sum.quantity || 0,
        totalRevenue: items._sum.totalPrice || 0,
        uniqueProducts: items._count,
      },
      topProducts,
    };
  }

  async getInventoryReport(vendorId?: string) {
    const where: any = vendorId ? { product: { vendorId } } : {};
    const [total, lowStock, outOfStock, expiringSoon] = await Promise.all([
      this.prisma.inventory.count({ where }),
      this.prisma.inventory.count({ where: { ...where, quantity: { lte: 10, gt: 0 } } }),
      this.prisma.inventory.count({ where: { ...where, quantity: 0 } }),
      this.prisma.inventory.count({
        where: { ...where, expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() } },
      }),
    ]);
    return { total, lowStock, outOfStock, expiringSoon };
  }

  async getCustomerReport() {
    const [totalCustomers, newThisMonth, activeCustomers] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
      this.prisma.crmProfile.count({ where: { lastPurchaseAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);
    return { totalCustomers, newThisMonth, activeCustomers, churnRate: ((totalCustomers - activeCustomers) / totalCustomers * 100).toFixed(1) };
  }

  async getVendorReport() {
    const [total, active, pending, suspended] = await Promise.all([
      this.prisma.vendor.count(),
      this.prisma.vendor.count({ where: { status: 'APPROVED' } }),
      this.prisma.vendor.count({ where: { status: 'PENDING' } }),
      this.prisma.vendor.count({ where: { status: 'SUSPENDED' } }),
    ]);
    return { total, active, pending, suspended };
  }

  async getProductReport(vendorId?: string) {
    const where: any = vendorId ? { vendorId } : {};
    const [total, active, draft, outOfStock] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.product.count({ where: { ...where, inventory: { every: { quantity: 0 } } } }),
    ]);
    return { total, active, draft, outOfStock };
  }

  async exportSalesCsv(startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.findMany({
      where: { paymentStatus: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    const rows = orders.flatMap(o =>
      o.items.map(i => ({
        orderNumber: o.orderNumber,
        date: o.createdAt.toISOString().split('T')[0],
        customer: `${o.user.firstName} ${o.user.lastName}`,
        email: o.user.email,
        product: i.name,
        qty: i.quantity,
        price: i.unitPrice,
        total: i.totalPrice,
        orderTotal: o.total,
        status: o.status,
      })),
    );

    const headers = ['Order #', 'Date', 'Customer', 'Email', 'Product', 'Qty', 'Unit Price', 'Item Total', 'Order Total', 'Status'];
    const csvRows = [headers.join(','), ...rows.map(r => Object.values(r).join(','))];
    return csvRows.join('\n');
  }

  async findAll(dto: PaginationDto) { return paginate([], 0, dto); }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() { return {}; }
}
