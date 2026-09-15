import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getByProduct(productId: string) {
    return this.prisma.inventory.findMany({
      where: { productId },
      include: { warehouse: { select: { name: true, code: true } }, variant: { select: { name: true, sku: true } } },
    });
  }

  async adjustStock(inventoryId: string, quantity: number, reason: string) {
    const inv = await this.prisma.inventory.findUnique({ where: { id: inventoryId } });
    if (!inv) throw new NotFoundException('Inventory record not found');
    if (inv.quantity + quantity < 0) throw new BadRequestException('Insufficient stock');

    const updated = await this.prisma.inventory.update({
      where: { id: inventoryId },
      data: { quantity: { increment: quantity } },
    });

    if (updated.quantity <= updated.lowStockAlert) {
      this.eventEmitter.emit('inventory.lowStock', { inventoryId, productId: updated.productId, quantity: updated.quantity });
    }
    return updated;
  }

  async bulkUpdate(updates: { inventoryId: string; quantity: number }[]) {
    const results = await Promise.all(
      updates.map(({ inventoryId, quantity }) =>
        this.prisma.inventory.update({ where: { id: inventoryId }, data: { quantity } })
      ),
    );
    return results;
  }

  async getLowStockAlerts(vendorId?: string) {
    const where: any = { quantity: { lte: this.prisma.inventory.fields.lowStockAlert } };
    if (vendorId) where.product = { vendorId };

    return this.prisma.inventory.findMany({
      where: {
        quantity: { lte: 5 },
        ...(vendorId && { product: { vendorId } }),
      },
      include: {
        product: { select: { id: true, name: true, images: true, sku: true } },
        warehouse: { select: { name: true } },
      },
    });
  }

  async getExpiringSoon(days = 30) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return this.prisma.inventory.findMany({
      where: { expiryDate: { lte: date, gte: new Date() } },
      include: { product: { select: { name: true, sku: true } }, warehouse: { select: { name: true } } },
    });
  }

  async transferStock(fromWarehouseId: string, toWarehouseId: string, productId: string, quantity: number) {
    const source = await this.prisma.inventory.findFirst({ where: { warehouseId: fromWarehouseId, productId } });
    if (!source) throw new NotFoundException('Source inventory not found');
    if (source.quantity - source.reservedQty < quantity) throw new BadRequestException('Insufficient available stock');

    await this.prisma.$transaction(async (tx) => {
      await tx.inventory.update({
        where: { id: source.id },
        data: { quantity: { decrement: quantity } },
      });

      const dest = await tx.inventory.findFirst({ where: { warehouseId: toWarehouseId, productId } });
      if (dest) {
        await tx.inventory.update({ where: { id: dest.id }, data: { quantity: { increment: quantity } } });
      } else {
        await tx.inventory.create({ data: { productId, warehouseId: toWarehouseId, quantity } });
      }
    });

    return { message: `Transferred ${quantity} units`, fromWarehouseId, toWarehouseId };
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkLowStockDaily() {
    const lowStock = await this.prisma.inventory.findMany({
      where: { quantity: { lte: 5 } },
      include: { product: { select: { vendorId: true, name: true } } },
    });

    for (const inv of lowStock) {
      this.eventEmitter.emit('inventory.lowStock', {
        productId: inv.productId,
        vendorId: inv.product.vendorId,
        productName: inv.product.name,
        quantity: inv.quantity,
      });
    }
  }
}
