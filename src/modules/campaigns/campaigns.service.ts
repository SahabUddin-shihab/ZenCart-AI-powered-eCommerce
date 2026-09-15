import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async getActive() {
    const now = new Date();
    return this.prisma.flashSale.findMany({
      where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
    });
  }

  async getUpcoming() {
    return this.prisma.flashSale.findMany({
      where: { isActive: true, startAt: { gt: new Date() } },
      orderBy: { startAt: 'asc' },
    });
  }

  async create(data: any) {
    return this.prisma.flashSale.create({ data });
  }

  async findAll(dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.flashSale.findMany({ skip: dto.skip, take: dto.take, orderBy: { startAt: 'desc' } }),
      this.prisma.flashSale.count(),
    ]);
    return paginate(data, total, dto);
  }

  async findById(id: string) { return this.prisma.flashSale.findUnique({ where: { id } }); }
  async update(id: string, data: any) { return this.prisma.flashSale.update({ where: { id }, data: data as any }); }
  async delete(id: string) { await this.prisma.flashSale.delete({ where: { id } }); return { message: 'Deleted' }; }
  async getStats() {
    const [total, active] = await Promise.all([
      this.prisma.flashSale.count(),
      this.prisma.flashSale.count({ where: { isActive: true } }),
    ]);
    return { total, active };
  }
}
