import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './providers/email.service';
import { NotificationEventsListener } from './notification-events.listener';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, NotificationEventsListener],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
