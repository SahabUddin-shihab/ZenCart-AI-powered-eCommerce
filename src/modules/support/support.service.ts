import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { generateTicketNumber } from '../../shared/utils/string.util';
import { AiChatService } from '../ai/ai-chat.service';

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private aiChat: AiChatService,
  ) {}

  async createTicket(userId: string, dto: {
    subject: string;
    message: string;
    category?: string;
    priority?: string;
    orderId?: string;
  }) {
    const ticketNumber = generateTicketNumber();
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        subject: dto.subject,
        category: dto.category,
        priority: (dto.priority || 'MEDIUM') as any,
        orderId: dto.orderId,
      },
    });

    await this.prisma.ticketMessage.create({
      data: { ticketId: ticket.id, senderId: userId, message: dto.message, isStaff: false },
    });

    // Auto-reply with AI for common queries
    await this.autoReply(ticket.id, dto.subject, dto.message, userId);

    return ticket;
  }

  private async autoReply(ticketId: string, subject: string, message: string, userId: string) {
    try {
      const commonPatterns = [
        { pattern: /order|track|delivery|ship/i, type: 'order_status' },
        { pattern: /return|refund|cancel/i, type: 'return_refund' },
        { pattern: /payment|pay|billing/i, type: 'payment' },
        { pattern: /password|login|account/i, type: 'account' },
      ];

      const matched = commonPatterns.find(p => p.pattern.test(subject) || p.pattern.test(message));
      if (!matched) return;

      const autoReplies: Record<string, string> = {
        order_status: 'Thank you for contacting us! You can track your order status in your account under "My Orders". If you need further assistance, our team will respond within 24 hours.',
        return_refund: 'We understand your concern. Our return policy allows returns within 7 days of delivery. To initiate a return, please go to "My Orders" and select "Request Return". Our team will review your request within 1-2 business days.',
        payment: 'For payment-related queries, our secure payment system supports multiple payment methods. If you faced a payment failure, please try again or contact your bank. Our team will assist you further.',
        account: 'For account-related issues, you can use the "Forgot Password" option on the login page. If you need further help, our team is here to assist you.',
      };

      const reply = autoReplies[matched.type];
      if (reply) {
        await this.prisma.ticketMessage.create({
          data: { ticketId, message: reply, isStaff: true, isAiReply: true },
        });
      }
    } catch (e) {
      // Silent fail for auto-reply
    }
  }

  async addMessage(ticketId: string, senderId: string, message: string, isStaff: boolean, attachments?: any[]) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!isStaff && ticket.userId !== senderId) throw new ForbiddenException('Not your ticket');

    const msg = await this.prisma.ticketMessage.create({
      data: { ticketId, senderId, message, isStaff, attachments: attachments as any },
    });

    if (isStaff && ticket.status === 'OPEN') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return msg;
  }

  async findAll(dto: PaginationDto & { status?: string; priority?: string }) {
    const where: any = {};
    if (dto.status) where.status = dto.status;
    if (dto.priority) where.priority = dto.priority;
    if (dto.search) where.subject = { contains: dto.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where, skip: dto.skip, take: dto.take, orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return paginate(data, total, dto);
  }

  async findById(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatar: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async findByUser(userId: string, dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { userId }, skip: dto.skip, take: dto.take, orderBy: { createdAt: 'desc' },
        include: { _count: { select: { messages: true } } },
      }),
      this.prisma.supportTicket.count({ where: { userId } }),
    ]);
    return paginate(data, total, dto);
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: status as any,
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
    });
  }

  async getStats() {
    const [total, open, inProgress, resolved] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
    ]);
    return { total, open, inProgress, resolved };
  }

  async create(data: any) { return data; }
  async update(id: string, data: any) { return this.prisma.supportTicket.update({ where: { id }, data: data as any }); }
  async delete(id: string) { await this.prisma.supportTicket.delete({ where: { id } }); return { message: 'Deleted' }; }
}
