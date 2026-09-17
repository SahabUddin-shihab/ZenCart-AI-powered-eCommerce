import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { generateReferralCode } from '../../shared/utils/string.util';

@Injectable()
export class AffiliateService {
  constructor(private prisma: PrismaService) {}

  async createProfile(userId: string) {
    const existing = await this.prisma.affiliateProfile.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Affiliate profile already exists');

    const code = generateReferralCode(8);
    return this.prisma.affiliateProfile.create({
      data: { userId, code },
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
      include: { links: true },
    });
    if (!profile) throw new NotFoundException('Affiliate profile not found');
    return profile;
  }

  async createLink(affiliateId: string, productId?: string) {
    const code = generateReferralCode(10);
    return this.prisma.affiliateLink.create({
      data: { affiliateId, productId, code },
    });
  }

  async trackClick(code: string) {
    const link = await this.prisma.affiliateLink.findUnique({ where: { code } });
    if (link) {
      await this.prisma.affiliateLink.update({
        where: { id: link.id },
        data: { clickCount: { increment: 1 } },
      });
    }
    return link;
  }

  async creditConversion(code: string, orderId: string, orderTotal: number) {
    const link = await this.prisma.affiliateLink.findUnique({
      where: { code },
      include: { affiliate: true },
    });
    if (!link) return;

    const commission = (orderTotal * Number(link.affiliate.commissionRate)) / 100;

    await Promise.all([
      this.prisma.affiliateLink.update({
        where: { id: link.id },
        data: { convertCount: { increment: 1 }, earnings: { increment: commission } },
      }),
      this.prisma.affiliateProfile.update({
        where: { id: link.affiliateId },
        data: { totalEarnings: { increment: commission }, pendingPayout: { increment: commission } },
      }),
    ]);

    return { commission, affiliateId: link.affiliateId };
  }

  async getLeaderboard(limit = 10) {
    return this.prisma.affiliateProfile.findMany({
      where: { isActive: true },
      orderBy: { totalEarnings: 'desc' },
      take: limit,
      include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
    });
  }

  async findAll(dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.affiliateProfile.findMany({
        skip: dto.skip, take: dto.take, orderBy: { totalEarnings: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.affiliateProfile.count(),
    ]);
    return paginate(data, total, dto);
  }

  async create(data: any) { return data; }
  async findById(id: string) { return this.prisma.affiliateProfile.findUnique({ where: { id } }); }
  async update(id: string, data: any) { return this.prisma.affiliateProfile.update({ where: { id }, data }); }
  async delete(id: string) { await this.prisma.affiliateProfile.delete({ where: { id } }); return { message: 'Deleted' }; }
  async getStats() {
    const [total, earnings] = await Promise.all([
      this.prisma.affiliateProfile.count(),
      this.prisma.affiliateProfile.aggregate({ _sum: { totalEarnings: true } }),
    ]);
    return { total, totalEarnings: earnings._sum.totalEarnings || 0 };
  }
}
