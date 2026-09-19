import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsEventsListener {
  constructor(private analytics: AnalyticsService) {}

  @OnEvent('order.placed')
  async handleOrderPlaced(event: any) {
    await this.analytics.trackEvent({
      eventType: 'order_placed',
      userId: event.userId,
      entityType: 'ORDER',
      entityId: event.orderId,
      properties: { total: event.total, itemCount: event.items.length },
    });
  }

  @OnEvent('user.registered')
  async handleUserRegistered(event: any) {
    await this.analytics.trackEvent({
      eventType: 'user_registered',
      userId: event.userId,
      properties: { email: event.email },
    });
  }
}
