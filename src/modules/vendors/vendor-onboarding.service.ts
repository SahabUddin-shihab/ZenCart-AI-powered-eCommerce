import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class VendorOnboardingService {
  constructor(private prisma: PrismaService) {}

  async getOnboardingStatus(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: true,
        warehouses: true,
        _count: { select: { products: true } },
      },
    });
    if (!vendor) return null;

    const steps = [
      { key: 'profile', label: 'Complete store profile', done: !!(vendor.storeName && vendor.storeDescription) },
      { key: 'logo', label: 'Upload store logo', done: !!vendor.storeLogo },
      { key: 'kyc', label: 'Complete KYC verification', done: vendor.kycStatus === 'APPROVED' },
      { key: 'product', label: 'Add first product', done: vendor._count.products > 0 },
      { key: 'warehouse', label: 'Set up warehouse', done: vendor.warehouses.length > 0 },
      { key: 'payout', label: 'Configure payout method', done: !!(vendor.payoutConfig) },
    ];

    const completed = steps.filter(s => s.done).length;
    return {
      percentage: Math.round((completed / steps.length) * 100),
      steps,
      isComplete: completed === steps.length,
    };
  }
}
