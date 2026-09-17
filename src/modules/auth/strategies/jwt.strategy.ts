import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) throw new Error('JWT_SECRET is not defined');

  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    secretOrKey: secret,
  });
}

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, status: true, avatar: true,
        vendor: { select: { id: true, storeName: true, status: true } },
      },
    });

    if (!user || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account not accessible');
    }

    return user;
  }
}
