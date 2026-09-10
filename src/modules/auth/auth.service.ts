import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, NotFoundException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { hashPassword, comparePassword } from '../../shared/utils/hash.util';
import { generateOtp } from '../../shared/utils/string.util';
import { UserRegisteredEvent, UserLoginEvent } from '../../shared/events/user.events';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private redis: RedisService,
    private eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role || 'CUSTOMER',
      },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true,
      },
    });

    // Create wallet & loyalty record
    await this.prisma.wallet.create({ data: { userId: user.id } });

    // Emit event
    this.eventEmitter.emit(
      'user.registered',
      new UserRegisteredEvent(user.id, user.email, `${user.firstName} ${user.lastName}`),
    );

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`New user registered: ${user.email}`);
    return { user, ...tokens };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { vendor: { select: { id: true, storeName: true, status: true } } },
    });

    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const valid = await comparePassword(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'SUSPENDED') throw new UnauthorizedException('Account suspended');
    if (user.status === 'INACTIVE') throw new UnauthorizedException('Account inactive');

    if (user.twoFactorEnabled && !dto.twoFactorCode) {
      return { requiresTwoFactor: true, userId: user.id };
    }

    if (user.twoFactorEnabled && dto.twoFactorCode) {
      const valid2fa = await this.verifyTwoFactorCode(user.id, dto.twoFactorCode);
      if (!valid2fa) throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    this.eventEmitter.emit('user.login', new UserLoginEvent(user.id, ip || '', userAgent || ''));

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken, ip, userAgent);

    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const session = await this.prisma.session.findUnique({
        where: { refreshToken: dto.refreshToken },
        include: { user: true },
      });

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(session.user);
      // Rotate refresh token
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.session.updateMany({
      where: { userId, refreshToken },
      data: { isActive: false },
    });
    await this.redis.del(`user:${userId}:session`);
  }

  async logoutAll(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  async verifyEmail(token: string) {
    const userId = await this.redis.get<string>(`email_verify:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired verification token');
    await this.prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
    await this.redis.del(`email_verify:${token}`);
    return { message: 'Email verified successfully' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If that email exists, a reset link has been sent' };

    const token = generateOtp(32);
    await this.redis.set(`pwd_reset:${token}`, user.id, 3600);
    this.eventEmitter.emit('auth.passwordReset', { userId: user.id, email, token });
    return { message: 'Password reset link sent to your email' };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.redis.get<string>(`pwd_reset:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired reset token');
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.redis.del(`pwd_reset:${token}`);
    await this.logoutAll(userId);
    return { message: 'Password reset successfully' };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    const valid = await comparePassword(password, user.passwordHash);
    return valid ? user : null;
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string, ip?: string, userAgent?: string) {
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken: token,
        ipAddress: ip,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  private async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
    // Simplified: check against stored OTP; real: use speakeasy TOTP
    const stored = await this.redis.get<string>(`2fa:${userId}`);
    return stored === code;
  }
}
