import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    userId?: string;
    action: string;
    module: string;
    entityType?: string;
    entityId?: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ data: data as any });
  }

  async findAll(dto: PaginationDto & { module?: string; userId?: string; action?: string }) {
    const where: any = {};
    if (dto.module) where.module = dto.module;
    if (dto.userId) where.userId = dto.userId;
    if (dto.action) where.action = dto.action;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, skip: dto.skip, take: dto.take, orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async getUserActivity(userId: string, dto: PaginationDto) {
    return this.findAll({ ...dto, userId } as any);
  }

  async getStats() {
    const total = await this.prisma.auditLog.count();
    const recent = await this.prisma.auditLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    return { total, last24Hours: recent };
  }

  async create(data: any) { return this.log(data); }
  async findById(id: string) { return this.prisma.auditLog.findUnique({ where: { id } }); }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
}
