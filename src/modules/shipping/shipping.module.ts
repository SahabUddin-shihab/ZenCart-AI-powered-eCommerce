import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { PathaoService } from './providers/pathao.service';
import { SteadFastService } from './providers/steadfast.service';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, PathaoService, SteadFastService],
  exports: [ShippingService],
})
export class ShippingModule {}
