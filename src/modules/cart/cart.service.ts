import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  private get cartInclude() {
    return {
      items: {
        include: {
          product: { select: { id: true, name: true, images: true, price: true, status: true } },
        },
      },
    };
  }

  async getOrCreate(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) throw new BadRequestException('userId or sessionId required');

    let cart = userId
      ? await this.prisma.cart.findUnique({ where: { userId }, include: this.cartInclude })
      : await this.prisma.cart.findUnique({ where: { sessionId: sessionId! }, include: this.cartInclude });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId, sessionId },
        include: this.cartInclude,
      });
    }
    return this.enrichCart(cart as any);
  }

  async addItem(userId: string, productId: string, quantity: number, variantId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') throw new NotFoundException('Product not available');

    let price = product.price;
    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
      if (variant?.price) price = variant.price;
    }

    const inventory = await this.prisma.inventory.findFirst({ where: { productId, variantId: variantId || null } });
    const available = (inventory?.quantity || 0) - (inventory?.reservedQty || 0);
    if (available < quantity) throw new BadRequestException(`Only ${available} items available`);

    const cart = await this.getOrCreate(userId);
    const cartId = (cart as any).id;

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cartId, productId, variantId: variantId || null },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (available < newQty) throw new BadRequestException(`Only ${available} items available`);
      await this.prisma.cartItem.update({ where: { id: existingItem.id }, data: { quantity: newQty } });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId, productId, variantId: variantId || null, quantity, price },
      });
    }

    return this.recalculate(cartId, userId);
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreate(userId);
    const cartId = (cart as any).id;
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException('Cart item not found');

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    }
    return this.recalculate(cartId, userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId: (cart as any).id } });
    return this.recalculate((cart as any).id, userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: (cart as any).id } });
    return this.recalculate((cart as any).id, userId);
  }

  async applyCoupon(userId: string, couponCode: string) {
    const cart = await this.getOrCreate(userId);
    const cartFull = cart as any;

    const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode } });
    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid or expired coupon');

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) throw new BadRequestException('Coupon not yet active');
    if (coupon.endDate && coupon.endDate < now) throw new BadRequestException('Coupon has expired');
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');

    if (coupon.minOrderAmount && cartFull.subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount is ${coupon.minOrderAmount} BDT`);
    }

    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE_DISCOUNT') {
      discountAmount = (cartFull.subtotal * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
    } else if (coupon.type === 'FIXED_DISCOUNT') {
      discountAmount = Number(coupon.discountValue);
    } else if (coupon.type === 'FREE_SHIPPING') {
      discountAmount = 60;
    }
    discountAmount = Math.min(discountAmount, cartFull.subtotal);

    await this.prisma.cart.update({
      where: { id: cartFull.id },
      data: { couponCode, discountAmount, total: cartFull.subtotal - discountAmount },
    });

    return { message: 'Coupon applied', discountAmount, couponCode };
  }

  async removeCoupon(userId: string) {
    const cart = await this.getOrCreate(userId);
    await this.prisma.cart.update({
      where: { id: (cart as any).id },
      data: { couponCode: null, discountAmount: 0, total: (cart as any).subtotal },
    });
    return { message: 'Coupon removed' };
  }

  private async recalculate(cartId: string, userId?: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      include: {
        product: { select: { id: true, name: true, images: true, price: true } },
      },
    });

    // Fetch variant prices separately
    const variantIds = items.map((i: any) => i.variantId).filter(Boolean);
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({ where: { id: { in: variantIds } } })
      : [];
    const variantMap = variants.reduce((acc: any, v: any) => { acc[v.id] = v; return acc; }, {});

    const subtotal = items.reduce((sum: number, item: any) => {
      const variant = item.variantId ? variantMap[item.variantId] : null;
      const price = variant?.price ? Number(variant.price) : Number(item.price);
      return sum + price * item.quantity;
    }, 0);

    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
    const discountAmount = Math.min(Number(cart?.discountAmount || 0), subtotal);
    const total = subtotal - discountAmount;

    const updated = await this.prisma.cart.update({
      where: { id: cartId },
      data: { subtotal, total, discountAmount },
      include: this.cartInclude,
    });

    // Enrich items with variant info
    const enrichedItems = (updated as any).items.map((item: any) => ({
      ...item,
      variant: item.variantId ? variantMap[item.variantId] : null,
    }));

    return this.enrichCart({ ...updated, items: enrichedItems } as any);
  }

  private enrichCart(cart: any) {
    const itemCount = cart.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
    return { ...cart, itemCount };
  }
}
