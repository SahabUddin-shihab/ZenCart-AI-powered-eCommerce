import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    const result = await this.prisma.loyaltyPoint.aggregate({
      where: { userId },
      _sum: { points: true },
    });
    return { totalPoints: result._sum.points || 0 };
  }

  async getHistory(userId: string, dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.loyaltyPoint.findMany({
        where: { userId }, skip: dto.skip, take: dto.take, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loyaltyPoint.count({ where: { userId } }),
    ]);
    return paginate(data, total, dto);
  }

  async award(userId: string, points: number, type: string, description: string, orderId?: string) {
    return this.prisma.loyaltyPoint.create({
      data: { userId, points, type, description, orderId },
    });
  }

  async redeem(userId: string, points: number) {
    const balance = await this.getBalance(userId);
    if (balance.totalPoints < points) throw new Error('Insufficient points');
    await this.prisma.loyaltyPoint.create({
      data: { userId, points: -points, type: 'REDEEMED', description: 'Points redeemed' },
    });
    const cashValue = points * 0.01; // 1 point = 0.01 BDT
    return { pointsRedeemed: points, cashValue };
  }

  async getLeaderboard(limit = 10) {
    return this.prisma.loyaltyPoint.groupBy({
      by: ['userId'],
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
      take: limit,
    });
  }

  async getTiers() {
    return [
      { name: 'Bronze', minPoints: 0, maxPoints: 999, benefits: ['5% discount', 'Birthday bonus'] },
      { name: 'Silver', minPoints: 1000, maxPoints: 4999, benefits: ['8% discount', 'Free shipping once/month', 'Birthday bonus'] },
      { name: 'Gold', minPoints: 5000, maxPoints: 19999, benefits: ['12% discount', 'Free shipping', 'Early access', 'Birthday gift'] },
      { name: 'Platinum', minPoints: 20000, maxPoints: null, benefits: ['15% discount', 'Free shipping', 'Dedicated support', 'VIP events', 'Birthday gift'] },
    ];
  }

  async getUserTier(userId: string) {
    const { totalPoints } = await this.getBalance(userId);
    const tiers = await this.getTiers();
    return tiers.find(t => totalPoints >= t.minPoints && (t.maxPoints === null || totalPoints <= t.maxPoints));
  }

  async findAll(dto: PaginationDto) { return paginate([], 0, dto); }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() { return { total: 0 }; }
}
