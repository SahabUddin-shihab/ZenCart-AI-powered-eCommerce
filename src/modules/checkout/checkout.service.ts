import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TaxationService } from '../taxation/taxation.service';
import { ShippingService } from '../shipping/shipping.service';
import { CouponsService } from '../coupons/coupons.service';
import { FraudDetectionService } from '../fraud-detection/fraud-detection.service';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private taxationService: TaxationService,
    private shippingService: ShippingService,
    private couponsService: CouponsService,
    private fraudDetection: FraudDetectionService,
  ) {}

  async summarize(userId: string, dto: {
    addressId?: string;
    couponCode?: string;
    shippingMethod?: string;
    paymentMethod?: string;
  }) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, price: true, images: true, status: true } },
          },
        },
      },
    });

    if (!cart || !(cart as any).items?.length) throw new BadRequestException('Cart is empty');

    const address = dto.addressId
      ? await this.prisma.address.findFirst({ where: { id: dto.addressId, userId } })
      : null;

    // Fetch variant prices separately
    const cartItems: any[] = (cart as any).items || [];
    const variantIds = cartItems.map((i: any) => i.variantId).filter(Boolean);
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({ where: { id: { in: variantIds } } })
      : [];
    const variantMap = variants.reduce((acc: any, v: any) => { acc[v.id] = v; return acc; }, {});

    let subtotal = 0;
    const lineItems = cartItems.map((item: any) => {
      const variant = item.variantId ? variantMap[item.variantId] : null;
      const unitPrice = variant?.price ? Number(variant.price) : Number(item.price);
      const total = unitPrice * item.quantity;
      subtotal += total;
      return { ...item, unitPrice, total, variant };
    });

    let discountAmount = 0;
    let couponInfo: any = null;
    const couponCode = dto.couponCode || (cart as any).couponCode;
    if (couponCode) {
      try {
        const validation = await this.couponsService.validate(couponCode, userId, subtotal);
        if ((validation as any).valid) {
          discountAmount = (validation as any).discountAmount || 0;
          couponInfo = { code: couponCode, discount: discountAmount };
        }
      } catch {}
    }

    const shippingRates = await this.shippingService.getRates(
      'Dhaka', address?.city || 'Dhaka', 0.5,
    ).catch(() => [{ courier: 'STANDARD', name: 'Standard Delivery', cost: 60, estimatedDays: '3-5' }]);

    const selectedShipping = (shippingRates as any[]).find((r: any) => r.courier === dto.shippingMethod) || (shippingRates as any[])[0];
    const shippingAmount = selectedShipping?.cost || 60;

    const taxResult = await this.taxationService.calculateTax(subtotal - discountAmount, 'BD');
    const taxAmount = taxResult.totalTax;
    const total = subtotal - discountAmount + shippingAmount + taxAmount;

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const loyaltyPoints = await this.prisma.loyaltyPoint.aggregate({ where: { userId }, _sum: { points: true } });

    return {
      items: lineItems,
      subtotal,
      coupon: couponInfo,
      discountAmount,
      shippingOptions: shippingRates,
      selectedShipping,
      shippingAmount,
      taxBreakdown: taxResult.breakdown,
      taxAmount,
      total,
      wallet: { balance: Number(wallet?.balance || 0) },
      loyaltyPoints: { available: loyaltyPoints._sum.points || 0, value: (loyaltyPoints._sum.points || 0) * 0.01 },
      paymentMethods: ['STRIPE', 'BKASH', 'SSLCOMMERZ', 'NAGAD', 'WALLET', 'COD'],
      address,
    };
  }

  async validateAndPreCheck(userId: string, ipAddress?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (!cart || !(cart as any).items?.length) throw new BadRequestException('Cart is empty');

    const issues: string[] = [];
    for (const item of (cart as any).items) {
      if (item.product.status !== 'ACTIVE') {
        issues.push(`${item.product.name} is no longer available`);
        continue;
      }
      const inv = await this.prisma.inventory.findFirst({ where: { productId: item.productId } });
      const available = (inv?.quantity || 0) - (inv?.reservedQty || 0);
      if (available < item.quantity) {
        issues.push(`${item.product.name}: only ${available} available`);
      }
    }

    return { valid: issues.length === 0, issues };
  }
}
