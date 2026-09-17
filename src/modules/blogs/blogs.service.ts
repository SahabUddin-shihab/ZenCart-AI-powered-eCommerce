import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { MeiliSearchService } from '../../infrastructure/search/meilisearch.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { generateSlug } from '../../shared/utils/string.util';

@Injectable()
export class BlogsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private search: MeiliSearchService,
  ) {}

  async create(authorId: string, dto: any) {
    const slug = dto.slug || generateSlug(dto.title);
    const readingTime = dto.content ? Math.ceil(dto.content.split(' ').length / 200) : 1;

    const blog = await this.prisma.blog.create({
      data: { authorId, slug, readingTime, ...dto },
    });

    await this.search.indexDocument('blogs', { id: blog.id, title: blog.title, tags: blog.tags });
    return blog;
  }

  async findAll(dto: PaginationDto & { tag?: string; published?: boolean }) {
    const where: any = {};
    if (dto.published !== undefined) where.isPublished = dto.published;
    else where.isPublished = true;
    if (dto.search) where.title = { contains: dto.search, mode: 'insensitive' };
    if (dto.tag) where.tags = { has: dto.tag };

    const [data, total] = await Promise.all([
      this.prisma.blog.findMany({
        where, skip: dto.skip, take: dto.take,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true, title: true, slug: true, excerpt: true, coverImage: true,
          tags: true, publishedAt: true, readingTime: true, viewCount: true,
        },
      }),
      this.prisma.blog.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async findBySlug(slug: string) {
    const cacheKey = `blog:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const blog = await this.prisma.blog.findUnique({ where: { slug, isPublished: true } });
    if (!blog) throw new NotFoundException('Blog post not found');

    await this.prisma.blog.update({ where: { id: blog.id }, data: { viewCount: { increment: 1 } } });
    await this.redis.set(cacheKey, blog, 600);
    return blog;
  }

  async update(id: string, dto: any) {
    const blog = await this.prisma.blog.update({ where: { id }, data: dto });
    await this.redis.del(`blog:${blog.slug}`);
    await this.search.updateDocument('blogs', { id: blog.id, title: blog.title, tags: blog.tags });
    return blog;
  }

  async publish(id: string) {
    const blog = await this.prisma.blog.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });
    await this.redis.del(`blog:${blog.slug}`);
    return blog;
  }

  async delete(id: string) {
    const blog = await this.prisma.blog.delete({ where: { id } });
    await this.redis.del(`blog:${blog.slug}`);
    await this.search.deleteDocument('blogs', id);
    return { message: 'Blog deleted' };
  }

  async getRelated(slug: string, limit = 4) {
    const blog = await this.prisma.blog.findUnique({ where: { slug } });
    if (!blog) return [];
    return this.prisma.blog.findMany({
      where: { isPublished: true, id: { not: blog.id }, tags: { hasSome: blog.tags } },
      take: limit,
      orderBy: { publishedAt: 'desc' },
      select: { id: true, title: true, slug: true, coverImage: true, publishedAt: true, readingTime: true },
    });
  }
}
