import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { CloudinaryService } from '../../infrastructure/storage/cloudinary.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { generateSlug } from '../../shared/utils/string.util';

@Injectable()
export class BrandsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private cloudinary: CloudinaryService,
  ) {}

  async findAll(dto: PaginationDto & { featured?: boolean }) {
    const where: any = { isActive: true };
    if (dto.featured) where.isFeatured = true;
    if (dto.search) where.name = { contains: dto.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.brand.findMany({
        where, skip: dto.skip, take: dto.take,
        orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.brand.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async findBySlug(slug: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { slug },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(dto: any) {
    const slug = dto.slug || generateSlug(dto.name);
    const exists = await this.prisma.brand.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Brand slug already exists');
    const brand = await this.prisma.brand.create({ data: { ...dto, slug } });
    await this.redis.del('brands:featured');
    return brand;
  }

  async update(id: string, dto: any) {
    const brand = await this.prisma.brand.update({ where: { id }, data: dto });
    await this.redis.del('brands:featured');
    return brand;
  }

  async uploadLogo(id: string, buffer: Buffer) {
    const result = await this.cloudinary.uploadBuffer(buffer, {
      folder: 'brand-logos', publicId: `brand_${id}`,
      transformation: [{ width: 200, height: 200, crop: 'fill' }],
    });
    await this.prisma.brand.update({ where: { id }, data: { logo: result.secureUrl } });
    return { logoUrl: result.secureUrl };
  }

  async delete(id: string) {
    const products = await this.prisma.product.count({ where: { brandId: id } });
    if (products > 0) throw new ConflictException('Cannot delete brand with existing products');
    await this.prisma.brand.delete({ where: { id } });
    return { message: 'Brand deleted' };
  }

  async getFeatured() {
    const cacheKey = 'brands:featured';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;
    const brands = await this.prisma.brand.findMany({
      where: { isFeatured: true, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    await this.redis.set(cacheKey, brands, 3600);
    return brands;
  }
}
