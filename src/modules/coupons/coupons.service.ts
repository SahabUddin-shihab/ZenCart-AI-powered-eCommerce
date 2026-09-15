import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Coupon code already exists');

    return this.prisma.coupon.create({ data: { ...dto } as any });
  }

  async findAll(dto: PaginationDto & { type?: string; isActive?: boolean }) {
    const where: any = {};
    if (dto.type) where.type = dto.type;
    if (dto.isActive !== undefined) where.isActive = dto.isActive;
    if (dto.search) where.code = { contains: dto.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({ where, skip: dto.skip, take: dto.take, orderBy: { createdAt: 'desc' }, include: { _count: { select: { usages: true } } } }),
      this.prisma.coupon.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async findById(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { usages: { take: 10, orderBy: { usedAt: 'desc' } }, _count: { select: { usages: true } } },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async validate(code: string, userId: string, cartTotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) return { valid: false, reason: 'Invalid coupon code' };

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) return { valid: false, reason: 'Coupon not yet active' };
    if (coupon.endDate && coupon.endDate < now) return { valid: false, reason: 'Coupon expired' };
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return { valid: false, reason: 'Coupon fully redeemed' };

    if (coupon.minOrderAmount && cartTotal < Number(coupon.minOrderAmount)) {
      return { valid: false, reason: `Minimum order ${coupon.minOrderAmount} BDT required` };
    }

    const userUsages = await this.prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (coupon.usageLimitPerUser && userUsages >= coupon.usageLimitPerUser) {
      return { valid: false, reason: 'You have already used this coupon' };
    }

    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE_DISCOUNT') {
      discountAmount = (cartTotal * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
    } else if (coupon.type === 'FIXED_DISCOUNT') {
      discountAmount = Math.min(Number(coupon.discountValue), cartTotal);
    } else if (coupon.type === 'FREE_SHIPPING') {
      discountAmount = 60;
    }

    return { valid: true, coupon, discountAmount };
  }

  async update(id: string, data: any) {
    return this.prisma.coupon.update({ where: { id }, data });
  }

  async deactivate(id: string) {
    return this.prisma.coupon.update({ where: { id }, data: { isActive: false } });
  }

  async delete(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'Coupon deleted' };
  }

  async getPublicCoupons() {
    return this.prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        aiTargetUserId: null,
      },
      select: { code: true, type: true, discountValue: true, minOrderAmount: true, endDate: true, name: true, description: true },
    });
  }

  async getStats() {
    const [total, active, totalUsages, totalDiscount] = await Promise.all([
      this.prisma.coupon.count(),
      this.prisma.coupon.count({ where: { isActive: true } }),
      this.prisma.couponUsage.count(),
      this.prisma.order.aggregate({ where: { couponCode: { not: null } }, _sum: { couponDiscount: true } }),
    ]);
    return { total, active, totalUsages, totalDiscountGiven: totalDiscount._sum.couponDiscount || 0 };
  }
}
