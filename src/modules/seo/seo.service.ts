import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class SeoService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async getMetadata(entityType: string, entityId: string) {
    return this.prisma.seoRule.findUnique({ where: { entityType_entityId: { entityType, entityId } } });
  }

  async upsertMetadata(entityType: string, entityId: string, data: any) {
    const result = await this.prisma.seoRule.upsert({
      where: { entityType_entityId: { entityType, entityId } },
      create: { entityType, entityId, ...data },
      update: data,
    });
    await this.redis.del(`seo:${entityType}:${entityId}`);
    return result;
  }

  async generateSitemap() {
    const [products, categories, blogs] = await Promise.all([
      this.prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { slug: true, updatedAt: true } }),
      this.prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      this.prisma.blog.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    ]);

    const baseUrl = process.env.APP_URL || 'https://aiecom.com';
    const urls: any[] = [
      { loc: baseUrl, changefreq: 'daily', priority: '1.0' },
      { loc: `${baseUrl}/shop`, changefreq: 'hourly', priority: '0.9' },
      { loc: `${baseUrl}/brands`, changefreq: 'weekly', priority: '0.7' },
      { loc: `${baseUrl}/blog`, changefreq: 'daily', priority: '0.7' },
    ];

    for (const p of products) {
      urls.push({ loc: `${baseUrl}/products/${p.slug}`, lastmod: p.updatedAt.toISOString(), changefreq: 'weekly', priority: '0.8' });
    }
    for (const c of categories) {
      urls.push({ loc: `${baseUrl}/categories/${c.slug}`, lastmod: c.updatedAt.toISOString(), changefreq: 'daily', priority: '0.8' });
    }
    for (const b of blogs) {
      urls.push({ loc: `${baseUrl}/blog/${b.slug}`, lastmod: b.updatedAt.toISOString(), changefreq: 'monthly', priority: '0.6' });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return xml;
  }

  async getRobotsTxt() {
    return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Sitemap: ${process.env.APP_URL}/sitemap.xml`;
  }

  async findAll(dto: any) { return { data: [], meta: { total: 0 } }; }
  async create(data: any) { return data; }
  async findById(id: string) { return { id }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async getStats() { return {}; }
}
