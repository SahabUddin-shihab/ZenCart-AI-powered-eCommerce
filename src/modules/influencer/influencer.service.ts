import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class InfluencerService {
  constructor(private prisma: PrismaService) {}

  async createProfile(userId: string, data: any) {
    return this.prisma.influencerProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async getProfile(userId: string) {
    return this.prisma.influencerProfile.findUnique({
      where: { userId },
      include: { user: { select: { firstName: true, lastName: true, email: true, avatar: true } } },
    });
  }

  async findAll(dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.influencerProfile.findMany({
        skip: dto.skip, take: dto.take, orderBy: { followers: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
      }),
      this.prisma.influencerProfile.count(),
    ]);
    return paginate(data, total, dto);
  }

  async create(data: any) { return data; }
  async findById(id: string) { return this.prisma.influencerProfile.findUnique({ where: { id } }); }
  async update(id: string, data: any) { return this.prisma.influencerProfile.update({ where: { id }, data: data as any }); }
  async delete(id: string) { await this.prisma.influencerProfile.delete({ where: { id } }); return { message: 'Deleted' }; }
  async getStats() { return { total: await this.prisma.influencerProfile.count() }; }
}
