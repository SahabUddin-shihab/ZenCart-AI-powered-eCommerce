import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class FeatureFlagsService {
  constructor(private prisma: PrismaService) {}

  async getPublic() {
    const flags = await this.prisma.featureFlag.findMany({ where: { isEnabled: true } });
    return flags.reduce((acc: any, f: any) => {
      acc[f.key] = { enabled: f.isEnabled, rolloutPct: f.rolloutPct };
      return acc;
    }, {});
  }

  async check(key: string, userId?: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) return { key, enabled: false };
    let enabled = flag.isEnabled;
    if (enabled && flag.rolloutPct < 100 && userId) {
      const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 100;
      enabled = hash < flag.rolloutPct;
    }
    return { key, enabled };
  }

  async findAll(dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.featureFlag.findMany({ skip: dto.skip, take: dto.take }),
      this.prisma.featureFlag.count(),
    ]);
    return paginate(data, total, dto);
  }

  async create(data: any) { return this.prisma.featureFlag.create({ data }); }
  async findById(id: string) { return this.prisma.featureFlag.findUnique({ where: { id } }); }
  async update(id: string, data: any) { return this.prisma.featureFlag.update({ where: { id }, data }); }
  async delete(id: string) { await this.prisma.featureFlag.delete({ where: { id } }); return { message: 'Deleted' }; }

  async toggle(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new Error('Flag not found');
    return this.prisma.featureFlag.update({ where: { key }, data: { isEnabled: !flag.isEnabled } });
  }

  async getStats() {
    const [total, enabled] = await Promise.all([
      this.prisma.featureFlag.count(),
      this.prisma.featureFlag.count({ where: { isEnabled: true } }),
    ]);
    return { total, enabled };
  }
}
