import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { CloudinaryService } from '../../infrastructure/storage/cloudinary.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateBeautyProfileDto } from './dto/update-beauty-profile.dto';
import { hashPassword } from '../../shared/utils/hash.util';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private cloudinary: CloudinaryService,
  ) {}

  async findAll(dto: PaginationDto) {
    const where: any = {};
    if (dto.search) {
      where.OR = [
        { email: { contains: dto.search, mode: 'insensitive' } },
        { firstName: { contains: dto.search, mode: 'insensitive' } },
        { lastName: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: dto.skip,
        take: dto.take,
        orderBy: { [dto.sortBy || 'createdAt']: dto.sortOrder || 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, status: true, avatar: true, createdAt: true,
          emailVerified: true, phoneVerified: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async findById(id: string) {
    const cacheKey = `user:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        role: true, status: true, avatar: true, emailVerified: true,
        aiBeautyProfile: true, skinType: true, skinConcerns: true,
        preferredShades: true, languageCode: true, currencyCode: true,
        createdAt: true, lastLoginAt: true,
        wallet: { select: { balance: true, currency: true } },
        crmProfile: { select: { lifetimeValue: true, totalOrders: true, segment: true } },
        _count: { select: { orders: true, reviews: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    await this.redis.set(cacheKey, user, 300);
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (exists) throw new ConflictException('Email already in use');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { ...dto },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatar: true, languageCode: true, currencyCode: true,
      },
    });

    await this.redis.del(`user:${id}`);
    return updated;
  }

  async updateBeautyProfile(userId: string, dto: UpdateBeautyProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        aiBeautyProfile: dto.profile as any,
        skinType: dto.skinType,
        skinConcerns: dto.skinConcerns || [],
        preferredShades: dto.preferredShades || [],
      },
      select: { id: true, aiBeautyProfile: true, skinType: true, skinConcerns: true, preferredShades: true },
    });
    await this.redis.del(`user:${userId}`);
    return updated;
  }

  async uploadAvatar(userId: string, buffer: Buffer) {
    const result = await this.cloudinary.uploadBuffer(buffer, {
      folder: 'avatars',
      publicId: `avatar_${userId}`,
      transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
    });
    await this.prisma.user.update({ where: { id: userId }, data: { avatar: result.secureUrl } });
    await this.redis.del(`user:${userId}`);
    return { avatarUrl: result.secureUrl };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new BadRequestException('No password set');
    const { comparePassword } = await import('../../shared/utils/hash.util');
    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Password updated successfully' };
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  async addAddress(userId: string, data: any) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.create({ data: { ...data, userId } });
  }

  async deleteAddress(addressId: string, userId: string) {
    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');
    await this.prisma.address.delete({ where: { id: addressId } });
    return { message: 'Address deleted' };
  }

  async getOrderHistory(userId: string, dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        skip: dto.skip, take: dto.take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: { select: { name: true, images: true } } } },
          shipments: { select: { status: true, trackingNumber: true } },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return paginate(data, total, dto);
  }

  async getWishlist(userId: string) {
    return this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, price: true, images: true, rating: true },
            },
          },
        },
      },
    });
  }

  async getLoyaltyPoints(userId: string) {
    const [points, history] = await Promise.all([
      this.prisma.loyaltyPoint.aggregate({
        where: { userId },
        _sum: { points: true },
      }),
      this.prisma.loyaltyPoint.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return { totalPoints: points._sum.points || 0, history };
  }

  async suspend(id: string) {
    return this.prisma.user.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }

  async activate(id: string) {
    return this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } });
  }
}
