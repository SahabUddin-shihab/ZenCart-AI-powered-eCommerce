import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getByRole(role: string) {
    const cacheKey = `permissions:${role}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const permissions = await this.prisma.permission.findMany({
      where: { role: role as any, isAllowed: true },
    });
    await this.redis.set(cacheKey, permissions, 3600);
    return permissions;
  }

  async check(role: string, module: string, action: string): Promise<boolean> {
    if (role === 'SUPER_ADMIN') return true;
    const perm = await this.prisma.permission.findFirst({
      where: { role: role as any, module, action, isAllowed: true },
    });
    return !!perm;
  }

  async upsert(role: string, module: string, action: string, isAllowed: boolean) {
    const result = await this.prisma.permission.upsert({
      where: { role_module_action: { role: role as any, module, action } },
      create: { role: role as any, module, action, isAllowed },
      update: { isAllowed },
    });
    await this.redis.del(`permissions:${role}`);
    return result;
  }

  async bulkUpsert(permissions: { role: string; module: string; action: string; isAllowed: boolean }[]) {
    const results = await Promise.all(permissions.map(p => this.upsert(p.role, p.module, p.action, p.isAllowed)));
    return results;
  }

  async getMatrix() {
    const all = await this.prisma.permission.findMany();
    const roles = ['ADMIN', 'MANAGER', 'VENDOR', 'STAFF', 'AFFILIATE', 'INFLUENCER'];
    const modules = [...new Set(all.map(p => p.module))];
    const matrix: any = {};
    for (const role of roles) {
      matrix[role] = {};
      for (const mod of modules) {
        const perms = all.filter(p => p.role === role && p.module === mod);
        matrix[role][mod as string] = perms.reduce(
  (acc, p) => ({
    ...acc,
    [p.action]: p.isAllowed,
  }),
  {}
);
      }
    }
    return matrix;
  }

  async findAll(dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.permission.findMany({ skip: dto.skip, take: dto.take }),
      this.prisma.permission.count(),
    ]);
    return paginate(data, total, dto);
  }

  async create(data: any) { return this.upsert(data.role, data.module, data.action, data.isAllowed); }
  async findById(id: string) { return this.prisma.permission.findUnique({ where: { id } }); }
  async update(id: string, data: any) { return this.prisma.permission.update({ where: { id }, data }); }
  async delete(id: string) { return this.prisma.permission.delete({ where: { id } }); }
  async getStats() {
    const total = await this.prisma.permission.count();
    return { total };
  }
}
