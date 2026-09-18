import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { generateSlug } from '../../shared/utils/string.util';

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}


  async getPage(slug: string) {
    const cacheKey = `cms:page:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const page = await this.prisma.page.findUnique({ where: { slug, isPublished: true } });
    if (!page) throw new NotFoundException('Page not found');
    await this.redis.set(cacheKey, page, 600);
    return page;
  }

  async createPage(data: any) {
    const slug = data.slug || generateSlug(data.title);
    return this.prisma.page.create({ data: { ...data, slug } });
  }

  async updatePage(id: string, data: any) {
    const updated = await this.prisma.page.update({ where: { id }, data });
    await this.redis.del(`cms:page:${updated.slug}`);
    return updated;
  }

  async publishPage(id: string) {
    const updated = await this.prisma.page.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });
    await this.redis.del(`cms:page:${updated.slug}`);
    return updated;
  }

  async getPages(includeUnpublished = false) {
    const where: any = {};
    if (!includeUnpublished) where.isPublished = true;
    return this.prisma.page.findMany({ where, orderBy: { createdAt: 'desc' } });
  }


  async getBlock(identifier: string) {
    const cacheKey = `cms:block:${identifier}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const block = await this.prisma.cmsBlock.findUnique({ where: { identifier, isActive: true } });
    if (!block) return null;
    await this.redis.set(cacheKey, block, 300);
    return block;
  }

  async getBlocksByType(type: string) {
    const cacheKey = `cms:blocks:${type}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const blocks = await this.prisma.cmsBlock.findMany({
      where: {
        type: type as any,
        isActive: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
      orderBy: { sortOrder: 'asc' },
    });
    await this.redis.set(cacheKey, blocks, 300);
    return blocks;
  }

  async getHomePage() {
    const cacheKey = 'cms:homepage';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const [hero, banners, featuredProducts, flashSale, categories, testimonials] = await Promise.all([
      this.getBlocksByType('HERO'),
      this.getBlocksByType('BANNER'),
      this.getBlocksByType('PRODUCT_GRID'),
      this.getBlocksByType('COUNTDOWN'),
      this.getBlocksByType('CATEGORY_GRID'),
      this.getBlocksByType('TESTIMONIAL'),
    ]);

    const homepage = { hero, banners, featuredProducts, flashSale, categories, testimonials };
    await this.redis.set(cacheKey, homepage, 300);
    return homepage;
  }

  async createBlock(data: any) {
    const block = await this.prisma.cmsBlock.create({ data });
    await this.redis.flushPattern('cms:block*');
    return block;
  }

  async updateBlock(id: string, data: any) {
    const block = await this.prisma.cmsBlock.update({ where: { id }, data });
    await this.redis.flushPattern('cms:block*');
    await this.redis.del('cms:homepage');
    return block;
  }

  async deleteBlock(id: string) {
    await this.prisma.cmsBlock.delete({ where: { id } });
    await this.redis.flushPattern('cms:block*');
    await this.redis.del('cms:homepage');
    return { message: 'Block deleted' };
  }
  
  async getMenu(location: string) {
    const cacheKey = `cms:menu:${location}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const menu = await this.prisma.menu.findUnique({ where: { location, isActive: true } });
    if (menu) await this.redis.set(cacheKey, menu, 600);
    return menu;
  }

  async upsertMenu(location: string, name: string, items: any[]) {
    const menu = await this.prisma.menu.upsert({
      where: { location },
      create: { location, name, items },
      update: { name, items },
    });
    await this.redis.del(`cms:menu:${location}`);
    return menu;
  }
}
