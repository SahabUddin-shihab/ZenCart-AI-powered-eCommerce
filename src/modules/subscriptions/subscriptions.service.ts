import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getVendorPlans() {
    return this.prisma.vendorPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  async upgradeVendorPlan(vendorId: string, planId: string) {
    const plan = await this.prisma.vendorPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { subscriptionPlanId: planId, subscriptionEndDate: endDate },
    });
  }

  async cancelVendorSubscription(vendorId: string) {
    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { subscriptionPlanId: null, subscriptionEndDate: null },
    });
  }

  async findAll(dto: PaginationDto) { return paginate([], 0, dto); }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() { return { total: await this.prisma.vendorPlan.count() }; }
}
