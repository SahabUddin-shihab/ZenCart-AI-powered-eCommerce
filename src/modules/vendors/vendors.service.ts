import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { CloudinaryService } from '../../infrastructure/storage/cloudinary.service';
import { MeiliSearchService } from '../../infrastructure/search/meilisearch.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { generateSlug } from '../../shared/utils/string.util';

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private cloudinary: CloudinaryService,
    private search: MeiliSearchService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateVendorDto) {
    const existing = await this.prisma.vendor.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Vendor profile already exists for this user');

    const slug = generateSlug(dto.storeName);
    const slugExists = await this.prisma.vendor.findUnique({ where: { storeSlug: slug } });
    if (slugExists) throw new ConflictException('Store name already taken');

    const vendor = await this.prisma.vendor.create({
      data: {
        userId,
        storeName: dto.storeName,
        storeSlug: slug,
        storeDescription: dto.storeDescription,
        commissionConfig: { type: 'PERCENTAGE', rate: 10 },
        shippingConfig: { freeShippingThreshold: 0 },
      },
    });

    await this.search.indexDocument('vendors', {
      id: vendor.id,
      name: vendor.storeName,
      slug: vendor.storeSlug,
    });

    await this.prisma.user.update({ where: { id: userId }, data: { role: 'VENDOR' } });
    this.eventEmitter.emit('vendor.created', { vendorId: vendor.id, userId });
    return vendor;
  }

  async findAll(dto: PaginationDto & { status?: string }) {
    const where: any = {};
    if (dto.status) where.status = dto.status;
    if (dto.search) {
      where.OR = [
        { storeName: { contains: dto.search, mode: 'insensitive' } },
        { storeSlug: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where, skip: dto.skip, take: dto.take,
        orderBy: { [dto.sortBy || 'createdAt']: dto.sortOrder || 'desc' },
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
      this.prisma.vendor.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async findById(id: string) {
    const cacheKey = `vendor:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, phone: true } },
        _count: { select: { products: true, orderItems: true } },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    await this.redis.set(cacheKey, vendor, 300);
    return vendor;
  }

  async findBySlug(slug: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { storeSlug: slug },
      include: {
        _count: { select: { products: true, reviews: true } },
      },
    });
    if (!vendor || vendor.status !== 'APPROVED') throw new NotFoundException('Vendor store not found');
    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (dto.storeName && dto.storeName !== vendor.storeName) {
      const newSlug = generateSlug(dto.storeName);
      const exists = await this.prisma.vendor.findFirst({
        where: { storeSlug: newSlug, id: { not: id } },
      });
      if (exists) throw new ConflictException('Store name already taken');
      (dto as any).storeSlug = newSlug;
    }

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: { ...dto },
    });

    await this.redis.del(`vendor:${id}`);
    await this.search.updateDocument('vendors', { id, name: updated.storeName, slug: updated.storeSlug });
    return updated;
  }

  async approve(id: string) {
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
    this.eventEmitter.emit('vendor.approved', { vendorId: id });
    await this.redis.del(`vendor:${id}`);
    return vendor;
  }

  async reject(id: string, reason: string) {
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: { status: 'REJECTED', metadata: { rejectionReason: reason } as any },
    });
    this.eventEmitter.emit('vendor.rejected', { vendorId: id, reason });
    await this.redis.del(`vendor:${id}`);
    return vendor;
  }

  async suspend(id: string) {
    await this.prisma.vendor.update({ where: { id }, data: { status: 'SUSPENDED' } });
    await this.redis.del(`vendor:${id}`);
    return { message: 'Vendor suspended' };
  }

  async uploadLogo(vendorId: string, buffer: Buffer) {
    const result = await this.cloudinary.uploadBuffer(buffer, {
      folder: 'vendor-logos',
      publicId: `logo_${vendorId}`,
      transformation: [{ width: 300, height: 300, crop: 'fill' }],
    });
    await this.prisma.vendor.update({ where: { id: vendorId }, data: { storeLogo: result.secureUrl } });
    await this.redis.del(`vendor:${vendorId}`);
    return { logoUrl: result.secureUrl };
  }

  async uploadBanner(vendorId: string, buffer: Buffer) {
    const result = await this.cloudinary.uploadBuffer(buffer, {
      folder: 'vendor-banners',
      publicId: `banner_${vendorId}`,
      transformation: [{ width: 1200, height: 400, crop: 'fill' }],
    });
    await this.prisma.vendor.update({ where: { id: vendorId }, data: { storeBanner: result.secureUrl } });
    await this.redis.del(`vendor:${vendorId}`);
    return { bannerUrl: result.secureUrl };
  }

  async submitKyc(vendorId: string, documents: any) {
    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { kycStatus: 'PENDING', kycDocuments: documents },
    });
  }

  async updateCommissionConfig(vendorId: string, config: any) {
    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { commissionConfig: config },
    });
  }

  async getVendorByUserId(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    return vendor;
  }

  async getPlans() {
    return this.prisma.vendorPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }
}
