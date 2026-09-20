import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private prisma: PrismaService) {}

  async getWorkflows() {
    return [
      { id: '1', name: 'Welcome Email', trigger: 'user.registered', status: 'ACTIVE', runs: 1240 },
      { id: '2', name: 'Abandoned Cart Recovery', trigger: 'cart.abandoned', status: 'ACTIVE', runs: 456 },
      { id: '3', name: 'Post-Purchase Review Request', trigger: 'order.delivered', status: 'ACTIVE', runs: 892 },
      { id: '4', name: 'Low Stock Alert to Vendor', trigger: 'inventory.lowStock', status: 'ACTIVE', runs: 67 },
      { id: '5', name: 'Win-Back Campaign', trigger: 'crm.churnRisk', status: 'PAUSED', runs: 23 },
      { id: '6', name: 'Birthday Discount', trigger: 'schedule.daily', status: 'ACTIVE', runs: 3421 },
    ];
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyAutomations() {
    this.logger.log('Running daily automations...');
    await this.checkAbandonedCarts();
    await this.sendBirthdayOffers();
  }

  private async checkAbandonedCarts() {
    const abandoned = await this.prisma.cart.findMany({
      where: {
        userId: { not: null },
        items: { some: {} },
        updatedAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: { user: { select: { email: true, firstName: true } } },
      take: 100,
    });
    this.logger.log(`Found ${abandoned.length} abandoned carts`);
  }

  private async sendBirthdayOffers() {
    const today = new Date();
    this.logger.log(`Checking birthday offers for ${today.toDateString()}`);
  }

  @OnEvent('inventory.lowStock')
  async handleLowStock(event: any) {
    this.logger.log(`Low stock alert: product ${event.productId}, qty: ${event.quantity}`);
  }

  async findAll(dto: PaginationDto) { return paginate(await this.getWorkflows(), 6, dto); }
  async create(data: any) { return { ...data, id: Date.now().toString(), status: 'ACTIVE' }; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Workflow deleted' }; }
  async getStats() { return { total: 6, active: 5, paused: 1 }; }
}
