import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService, private eventEmitter: EventEmitter2) {}

  async create(userId: string, dto: any) {
  
    const purchased = await this.prisma.orderItem.findFirst({
      where: { order: { userId, status: 'DELIVERED' }, productId: dto.productId },
    });

    const review = await this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        vendorId: dto.vendorId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        pros: dto.pros || [],
        cons: dto.cons || [],
        images: dto.images || [],
        isVerified: !!purchased,
        status: 'PENDING',
      },
    });

    this.eventEmitter.emit('review.created', { reviewId: review.id, productId: dto.productId });
    return review;
  }

  async findByProduct(productId: string, dto: PaginationDto & { rating?: number }) {
    const where: any = { productId, status: 'APPROVED' };
    if (dto.rating) where.rating = dto.rating;

    const [data, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where, skip: dto.skip, take: dto.take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { productId, status: 'APPROVED' },
        _count: true,
      }),
    ]);

    const avgRating = data.length > 0
      ? data.reduce((s, r) => s + r.rating, 0) / data.length
      : 0;

    return {
      ...paginate(data, total, dto),
      stats: { average: avgRating.toFixed(1), distribution: stats },
    };
  }

  async findAll(dto: PaginationDto & { status?: string }) {
    const where: any = {};
    if (dto.status) where.status = dto.status;
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where, skip: dto.skip, take: dto.take, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true } },
          product: { select: { name: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async approve(id: string) {
    const review = await this.prisma.review.update({ where: { id }, data: { status: 'APPROVED' } });
    await this.updateProductRating(review.productId);
    return review;
  }

  async reject(id: string) {
    return this.prisma.review.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  async reply(id: string, vendorId: string, replyText: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review || review.vendorId !== vendorId) throw new ForbiddenException('Not your review');
    return this.prisma.review.update({ where: { id }, data: { replyText, repliedAt: new Date() } });
  }

  async markHelpful(id: string) {
    return this.prisma.review.update({ where: { id }, data: { helpfulCount: { increment: 1 } } });
  }

  async delete(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('Not your review');
    await this.prisma.review.delete({ where: { id } });
    await this.updateProductRating(review.productId);
    return { message: 'Review deleted' };
  }

  private async updateProductRating(productId: string) {
    const stats = await this.prisma.review.aggregate({
      where: { productId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        rating: stats._avg.rating || 0,
        reviewCount: stats._count,
      },
    });
  }
}
