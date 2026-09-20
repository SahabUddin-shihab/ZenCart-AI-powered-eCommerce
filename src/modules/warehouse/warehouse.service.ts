import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    if (data.isDefault && data.vendorId) {
      await this.prisma.warehouse.updateMany({ where: { vendorId: data.vendorId }, data: { isDefault: false } });
    }
    return this.prisma.warehouse.create({ data });
  }

  async findAll(dto: PaginationDto & { vendorId?: string }) {
    const where: any = {};
    if (dto.vendorId) where.vendorId = dto.vendorId;
    const [data, total] = await Promise.all([
      this.prisma.warehouse.findMany({ where, skip: dto.skip, take: dto.take }),
      this.prisma.warehouse.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async findById(id: string) {
    const wh = await this.prisma.warehouse.findUnique({
      where: { id },
      include: { _count: { select: { inventory: true } } },
    });
    if (!wh) throw new NotFoundException('Warehouse not found');
    return wh;
  }

  async update(id: string, data: any) { return this.prisma.warehouse.update({ where: { id }, data }); }

  async getInventoryValue(id: string) {
    const inv = await this.prisma.inventory.findMany({
      where: { warehouseId: id },
      include: { product: { select: { name: true, price: true } } },
    });
    const totalValue = inv.reduce((s, i) => s + (Number(i.costPrice || i.product.price) * i.quantity), 0);
    return { warehouseId: id, totalItems: inv.length, totalValue, inventory: inv };
  }

  async delete(id: string) { await this.prisma.warehouse.delete({ where: { id } }); return { message: 'Deleted' }; }
  async getStats() { return { total: await this.prisma.warehouse.count(), active: await this.prisma.warehouse.count({ where: { isActive: true } }) }; }
}
