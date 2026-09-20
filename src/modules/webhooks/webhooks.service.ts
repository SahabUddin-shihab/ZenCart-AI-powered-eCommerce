import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { OnEvent } from '@nestjs/event-emitter';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: { url: string; events: string[]; secret?: string; headers?: any }) {
    return this.prisma.webhook.create({ data: data as any });
  }

  async findAll(dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.webhook.findMany({ skip: dto.skip, take: dto.take, orderBy: { createdAt: 'desc' } }),
      this.prisma.webhook.count(),
    ]);
    return paginate(data, total, dto);
  }

  async findById(id: string) { return this.prisma.webhook.findUnique({ where: { id } }); }

  async update(id: string, data: any) {
    return this.prisma.webhook.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.webhook.delete({ where: { id } });
    return { message: 'Webhook deleted' };
  }

  async testWebhook(id: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) throw new Error('Webhook not found');
    return this.deliver(webhook, 'webhook.test', { message: 'Test payload', timestamp: new Date() });
  }

  async dispatchEvent(event: string, payload: any) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { isActive: true, events: { has: event } },
    });
    await Promise.allSettled(webhooks.map(wh => this.deliver(wh, event, payload)));
  }

  private async deliver(webhook: any, event: string, payload: any) {
    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
    const signature = webhook.secret
      ? crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')
      : undefined;

    const headers: any = {
      'Content-Type': 'application/json',
      'X-AIeCom-Event': event,
      ...(webhook.headers || {}),
    };
    if (signature) headers['X-AIeCom-Signature'] = `sha256=${signature}`;

    let success = false;
    let statusCode: number | undefined;
    let response: any;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const resp = await axios.post(webhook.url, body, { headers, timeout: 10000 });
        success = true;
        statusCode = resp.status;
        response = resp.data;
        break;
      } catch (err) {
        statusCode = err.response?.status;
        response = err.message;
        if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
      }
    }

    await this.prisma.webhookDelivery.create({
      data: { webhookId: webhook.id, event, payload, response, statusCode, success, attempts: 3 },
    });

    if (success) {
      await this.prisma.webhook.update({ where: { id: webhook.id }, data: { lastPingAt: new Date() } });
    }
    return { success, statusCode };
  }

  async getDeliveries(webhookId: string, dto: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where: { webhookId }, skip: dto.skip, take: dto.take, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.webhookDelivery.count({ where: { webhookId } }),
    ]);
    return paginate(data, total, dto);
  }

  @OnEvent('order.placed') async onOrderPlaced(e: any) { await this.dispatchEvent('order.placed', e); }
  @OnEvent('order.statusChanged') async onOrderStatus(e: any) { await this.dispatchEvent('order.status_changed', e); }
  @OnEvent('payment.completed') async onPayment(e: any) { await this.dispatchEvent('payment.completed', e); }
  @OnEvent('vendor.approved') async onVendorApproved(e: any) { await this.dispatchEvent('vendor.approved', e); }

  async getStats() {
    const [total, active, deliveries] = await Promise.all([
      this.prisma.webhook.count(),
      this.prisma.webhook.count({ where: { isActive: true } }),
      this.prisma.webhookDelivery.count(),
    ]);
    return { total, active, totalDeliveries: deliveries };
  }
}
