import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { transactions: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId },
        include: { transactions: true },
      });
    }
    return wallet;
  }

  async topUp(userId: string, amount: number, reference: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'TOPUP',
        amount,
        balance: Number(wallet.balance),
        description: 'Wallet top-up',
        reference,
      },
    });
    return wallet;
  }

  async deduct(userId: string, amount: number, description: string, reference?: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (Number(wallet.balance) < amount) throw new BadRequestException('Insufficient wallet balance');
    const updated = await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id, type: 'DEDUCT', amount: -amount,
        balance: Number(updated.balance), description, reference,
      },
    });
    return updated;
  }

  async addCashback(userId: string, amount: number, orderId: string) {
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      create: { userId, balance: amount },
      update: { balance: { increment: amount } },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id, type: 'CASHBACK', amount,
        balance: Number(wallet.balance), description: 'Order cashback', reference: orderId,
      },
    });
    return wallet;
  }

  async getTransactions(userId: string, dto: PaginationDto) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        skip: dto.skip, take: dto.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);
    return paginate(data, total, dto);
  }

  async getStats() {
    const stats = await this.prisma.wallet.aggregate({
      _sum: { balance: true },
      _count: true,
    });
    return { totalBalance: stats._sum.balance || 0, totalWallets: stats._count };
  }

  async findById(id: string) {
    return this.prisma.wallet.findUnique({ where: { id } });
  }

  async create(data: any) { return { data, message: 'Created' }; }
  async update(id: string, data: any) { return { id, ...data }; }
  async delete(id: string) { return { message: 'Deleted' }; }
  async findAll(dto: PaginationDto) { return paginate([], 0, dto); }
}
