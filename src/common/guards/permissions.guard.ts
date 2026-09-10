import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<{ module: string; action: string }>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Authentication required');

    if (user.role === 'SUPER_ADMIN') return true;

    const permission = await this.prisma.permission.findFirst({
      where: {
        role: user.role,
        module: required.module,
        action: required.action,
        isAllowed: true,
      },
    });

    if (!permission) {
      throw new ForbiddenException(
        `Insufficient permissions: ${required.module}:${required.action}`,
      );
    }
    return true;
  }
}
