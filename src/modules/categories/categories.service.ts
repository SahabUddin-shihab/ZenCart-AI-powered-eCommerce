import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { CloudinaryService } from '../../infrastructure/storage/cloudinary.service';
import { generateSlug } from '../../shared/utils/string.util';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private cloudinary: CloudinaryService,
  ) {}

  async getTree() {
    const cacheKey = 'categories:tree';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    const buildTree = (items: any[], parentId: string | null = null): any[] =>
      items
        .filter(c => c.parentId === parentId)
        .map(c => ({ ...c, children: buildTree(items, c.id) }));

    const tree = buildTree(categories);
    await this.redis.set(cacheKey, tree, 3600);
    return tree;
  }

  async findAll(includeInactive = false) {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        parent: { select: { name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    const cat = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        parent: { select: { name: true, slug: true } },
        _count: { select: { products: true } },
      },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(dto: any) {
    const slug = dto.slug || generateSlug(dto.name);
    const exists = await this.prisma.category.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Category slug already exists');
    const category = await this.prisma.category.create({ data: { ...dto, slug } });
    await this.redis.del('categories:tree');
    return category;
  }

  async update(id: string, dto: any) {
    const category = await this.prisma.category.update({ where: { id }, data: dto });
    await this.redis.del('categories:tree');
    return category;
  }

  async uploadImage(id: string, buffer: Buffer) {
    const result = await this.cloudinary.uploadBuffer(buffer, {
      folder: 'categories',
      publicId: `cat_${id}`,
      transformation: [{ width: 400, height: 400, crop: 'fill' }],
    });
    await this.prisma.category.update({ where: { id }, data: { image: result.secureUrl } });
    await this.redis.del('categories:tree');
    return { imageUrl: result.secureUrl };
  }

  async delete(id: string) {
    const hasChildren = await this.prisma.category.count({ where: { parentId: id } });
    if (hasChildren) throw new ConflictException('Cannot delete category with sub-categories');
    await this.prisma.category.delete({ where: { id } });
    await this.redis.del('categories:tree');
    return { message: 'Category deleted' };
  }

  async reorder(items: { id: string; sortOrder: number }[]) {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        this.prisma.category.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    await this.redis.del('categories:tree');
    return { message: 'Categories reordered' };
  }
}
