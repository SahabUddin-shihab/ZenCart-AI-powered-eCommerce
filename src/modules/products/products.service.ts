import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { CloudinaryService } from '../../infrastructure/storage/cloudinary.service';
import { MeiliSearchService } from '../../infrastructure/search/meilisearch.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { generateSlug } from '../../shared/utils/string.util';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private cloudinary: CloudinaryService,
    private meili: MeiliSearchService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(vendorId: string, dto: CreateProductDto) {
    const slug = generateSlug(dto.name);
    const existingSlug = await this.prisma.product.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const product = await this.prisma.product.create({
      data: {
        vendorId,
        name: dto.name,
        slug: finalSlug,
        shortDescription: dto.shortDescription,
        description: dto.description,
        type: (dto.type || 'SIMPLE') as any,
        price: dto.price,
        comparePrice: dto.comparePrice,
        costPrice: dto.costPrice,
        sku: dto.sku,
        barcode: dto.barcode,
        brandId: dto.brandId,
        dynamicAttributes: dto.dynamicAttributes as any,
        ingredients: dto.ingredients as any,
        skinTypes: dto.skinTypes || [],
        concerns: dto.concerns || [],
        tags: dto.tags || [],
        images: dto.images as any,
      },
    });

    // Set up categories
    if (dto.categoryIds?.length) {
      await this.prisma.productCategory.createMany({
        data: dto.categoryIds.map(cid => ({ productId: product.id, categoryId: cid })),
      });
    }

    // Create default inventory
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { vendorId, isDefault: true },
    });
    if (warehouse) {
      await this.prisma.inventory.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: dto.stock || 0,
        },
      });
    }

    await this.indexProduct(product.id);
    this.eventEmitter.emit('product.created', { productId: product.id, vendorId });
    return product;
  }

  async findAll(dto: ProductFilterDto) {
    const where: any = { deletedAt: null };
    if (dto.status) where.status = dto.status;
    else where.status = 'ACTIVE';

    if (dto.vendorId) where.vendorId = dto.vendorId;
    if (dto.brandId) where.brandId = dto.brandId;
    if (dto.type) where.type = dto.type;

    if (dto.minPrice || dto.maxPrice) {
      where.price = {};
      if (dto.minPrice) where.price.gte = dto.minPrice;
      if (dto.maxPrice) where.price.lte = dto.maxPrice;
    }

    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
        { tags: { has: dto.search } },
      ];
    }

    if (dto.categoryId) {
      where.categories = { some: { categoryId: dto.categoryId } };
    }

    if (dto.skinType) {
      where.skinTypes = { has: dto.skinType };
    }

    const orderBy: any = {};
    const sortField = dto.sortBy || 'createdAt';
    orderBy[sortField] = dto.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip: dto.skip, take: dto.take, orderBy,
        include: {
          vendor: { select: { storeName: true, storeSlug: true } },
          brand: { select: { name: true, logo: true } },
          categories: { include: { category: { select: { name: true, slug: true } } } },
          inventory: { select: { quantity: true, reservedQty: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async findById(id: string) {
    const cacheKey = `product:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: {
        vendor: { select: { id: true, storeName: true, storeSlug: true, storeLogo: true, rating: true } },
        brand: true,
        categories: { include: { category: true } },
        variants: true,
        inventory: { include: { warehouse: { select: { name: true } } } },
        _count: { select: { reviews: true, orderItems: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    await this.prisma.product.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    await this.redis.set(cacheKey, product, 600);
    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug, status: 'ACTIVE', deletedAt: null },
      include: {
        vendor: { select: { id: true, storeName: true, storeSlug: true, storeLogo: true, rating: true } },
        brand: true,
        categories: { include: { category: true } },
        variants: true,
        inventory: { select: { quantity: true, reservedQty: true } },
        _count: { select: { reviews: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    await this.prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } });
    return product;
  }

  async update(id: string, vendorId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.vendorId !== vendorId) throw new ForbiddenException('Not your product');

    const updated = await this.prisma.product.update({
      where: { id },
      data: { ...dto } as any,
    });

    if (dto.categoryIds) {
      await this.prisma.productCategory.deleteMany({ where: { productId: id } });
      await this.prisma.productCategory.createMany({
        data: dto.categoryIds.map(cid => ({ productId: id, categoryId: cid })),
      });
    }

    await this.redis.del(`product:${id}`);
    await this.indexProduct(id);
    return updated;
  }

  async publish(id: string) {
    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: 'ACTIVE', publishedAt: new Date() },
    });
    await this.redis.del(`product:${id}`);
    return updated;
  }

  async unpublish(id: string) {
    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    await this.redis.del(`product:${id}`);
    return updated;
  }

  async softDelete(id: string, vendorId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.vendorId !== vendorId) throw new ForbiddenException('Not your product');
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), status: 'ARCHIVED' } });
    await this.redis.del(`product:${id}`);
    await this.meili.deleteDocument('products', id);
    return { message: 'Product deleted' };
  }

  async addVariant(productId: string, variantData: any) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.productVariant.create({
      data: { productId, ...variantData },
    });
  }

  async uploadImages(productId: string, files: Express.Multer.File[]) {
    const uploads = await Promise.all(
      files.map(file => this.cloudinary.uploadBuffer(file.buffer, {
        folder: 'products',
        tags: ['product', productId],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      }))
    );
    const imageUrls = uploads.map(u => ({ url: u.secureUrl, publicId: u.publicId }));
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    const existingImages = (product?.images as any[]) || [];
    await this.prisma.product.update({
      where: { id: productId },
      data: { images: [...existingImages, ...imageUrls] as any },
    });
    await this.redis.del(`product:${productId}`);
    return imageUrls;
  }

  async search(query: string, filters?: any): Promise<any> {
    const results = await this.meili.search('products', query, {
      limit: 20,
      filter: filters,
    });
    return results;
  }

  async getFeatured(limit = 12) {
    const cacheKey = `products:featured:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const products = await this.prisma.product.findMany({
      where: { isFeatured: true, status: 'ACTIVE', deletedAt: null },
      take: limit,
      orderBy: { soldCount: 'desc' },
      include: {
        vendor: { select: { storeName: true } },
        brand: { select: { name: true } },
      },
    });
    await this.redis.set(cacheKey, products, 600);
    return products;
  }

  async getBestsellers(limit = 12) {
    return this.prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      take: limit,
      orderBy: { soldCount: 'desc' },
      include: { vendor: { select: { storeName: true } } },
    });
  }

  async getVendorProducts(vendorId: string, dto: PaginationDto) {
    const where: any = { vendorId, deletedAt: null };
    if (dto.search) {
      where.name = { contains: dto.search, mode: 'insensitive' };
    }
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip: dto.skip, take: dto.take,
        orderBy: { createdAt: 'desc' },
        include: { inventory: { select: { quantity: true } }, _count: { select: { reviews: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  private async indexProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { brand: { select: { name: true } }, categories: { include: { category: { select: { name: true } } } } },
    });
    if (!product) return;
    await this.meili.indexDocument('products', {
      id: product.id,
      name: product.name,
      description: product.shortDescription,
      price: Number(product.price),
      brand: product.brand?.name,
      category: product.categories.map(c => c.category.name).join(' '),
      tags: product.tags,
      status: product.status,
      vendorId: product.vendorId,
      rating: product.rating,
      skinTypes: product.skinTypes,
    });
  }
}
