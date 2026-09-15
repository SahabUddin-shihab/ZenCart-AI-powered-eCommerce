import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async scoreOrder(orderId: string, userId: string, ipAddress: string, userAgent: string): Promise<{
    score: number;
    risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    flags: string[];
    action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  }> {
    const flags: string[] = [];
    let score = 0;

    // Check order velocity
    const recentOrders = await this.prisma.order.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recentOrders > 5) { score += 30; flags.push('HIGH_ORDER_VELOCITY'); }

    // Check IP velocity
    const ipKey = `fraud:ip:${ipAddress}`;
    const ipCount = await this.redis.incr(ipKey);
    await this.redis.expire(ipKey, 3600);
    if (ipCount > 10) { score += 25; flags.push('HIGH_IP_VELOCITY'); }

    // Check failed payments
    const failedPayments = await this.prisma.payment.count({
      where: { orderId, status: 'FAILED' },
    });
    if (failedPayments >= 3) { score += 40; flags.push('MULTIPLE_PAYMENT_FAILURES'); }

    // Check account age
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const accountAgeDays = (Date.now() - user.createdAt.getTime()) / 86400000;
      if (accountAgeDays < 1) { score += 20; flags.push('NEW_ACCOUNT'); }
    }

    // Check for high-value orders on new accounts
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (order && Number(order.total) > 10000 && (user ? (Date.now() - user.createdAt.getTime()) / 86400000 < 7 : true)) {
      score += 20; flags.push('HIGH_VALUE_NEW_ACCOUNT');
    }

    const risk = score >= 70 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';
    const action = score >= 70 ? 'BLOCK' : score >= 50 ? 'REVIEW' : 'ALLOW';

    this.logger.log(`Fraud score for order ${orderId}: ${score} (${risk})`);

    if (risk === 'HIGH' || risk === 'CRITICAL') {
      await this.prisma.analyticsEvent.create({
        data: {
          eventType: 'fraud_alert',
          userId,
          entityType: 'ORDER',
          entityId: orderId,
          properties: { score, risk, flags, ipAddress } as any,
        },
      });
    }

    return { score, risk, flags, action };
  }

  async getAlerts(dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where: { eventType: 'fraud_alert' },
        skip: dto.skip, take: dto.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.analyticsEvent.count({ where: { eventType: 'fraud_alert' } }),
    ]);
    return paginate(data, total, dto);
  }

  async findAll(dto: PaginationDto) { return this.getAlerts(dto); }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() {
    const total = await this.prisma.analyticsEvent.count({ where: { eventType: 'fraud_alert' } });
    return { totalAlerts: total };
  }
}
