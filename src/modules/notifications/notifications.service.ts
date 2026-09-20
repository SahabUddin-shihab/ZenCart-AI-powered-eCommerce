import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
// import { RealtimeGateway } from '../../infrastructure/websocket/realtime.gateway';
import { EmailService } from './providers/email.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    // private realtimeGateway: RealtimeGateway,
    private emailService: EmailService,
  ) {}

  async send(userId: string, notification: {
    type: string;
    title: string;
    body: string;
    imageUrl?: string;
    actionUrl?: string;
    metadata?: any;
  }) {
    const saved = await this.prisma.notification.create({
      data: {
        userId,
        type: notification.type as any,
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata,
      },
    });

    // Real-time delivery
    // this.realtimeGateway.emit(userId, 'notification', {
    //   id: saved.id,
    //   title: saved.title,
    //   body: saved.body,
    //   actionUrl: saved.actionUrl,
    //   createdAt: saved.createdAt,
    // });

    return saved;
  }

  async sendBulk(userIds: string[], notification: any) {
    const results = await Promise.allSettled(
      userIds.map(uid => this.send(uid, notification)),
    );
    const success = results.filter(r => r.status === 'fulfilled').length;
    return { sent: success, failed: userIds.length - success };
  }

  async sendToRole(role: string, notification: any) {
    const users = await this.prisma.user.findMany({
      where: { role: role as any, status: 'ACTIVE' },
      select: { id: true },
    });
    return this.sendBulk(users.map(u => u.id), notification);
  }

  async getByUser(userId: string, dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip: dto.skip, take: dto.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    const unread = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { ...paginate(data, total, dto), unread };
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }
}
