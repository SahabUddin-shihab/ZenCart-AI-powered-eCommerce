import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class FlashSalesService {
  constructor(private prisma: PrismaService) {}

  async getActive() {
    const now = new Date();
    return this.prisma.flashSale.findMany({
      where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
    });
  }

  async create(data: any) { return this.prisma.flashSale.create({ data }); }

  async findAll(dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.flashSale.findMany({ skip: dto.skip, take: dto.take }),
      this.prisma.flashSale.count(),
    ]);
    return paginate(data, total, dto);
  }

  async findById(id: string) { return this.prisma.flashSale.findUnique({ where: { id } }); }
  async update(id: string, data: any) { return this.prisma.flashSale.update({ where: { id }, data: data as any }); }
  async delete(id: string) { await this.prisma.flashSale.delete({ where: { id } }); return { message: 'Deleted' }; }
  async getStats() { return { total: await this.prisma.flashSale.count() }; }
}
