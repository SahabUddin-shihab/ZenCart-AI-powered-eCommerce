import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private config: ConfigService,
  ) {}

  async generateSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `AIeCom:${email}`,
      issuer: 'AIeCom',
      length: 32,
    });

    await this.redis.set(`2fa_setup:${userId}`, secret.base32, 600);
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrCode };
  }

  async enableTwoFactor(userId: string, token: string): Promise<boolean> {
    const secret = await this.redis.get<string>(`2fa_setup:${userId}`);
    if (!secret) return false;

    const valid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!valid) return false;

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorSecret: secret },
    });
    await this.redis.del(`2fa_setup:${userId}`);
    return true;
  }

  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });
    if (!user?.twoFactorSecret) return false;

    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }
}
