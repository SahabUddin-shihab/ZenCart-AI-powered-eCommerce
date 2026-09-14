import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderEventsListener } from './order-events.listener';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderEventsListener],
  exports: [OrdersService],
})
export class OrdersModule {}
