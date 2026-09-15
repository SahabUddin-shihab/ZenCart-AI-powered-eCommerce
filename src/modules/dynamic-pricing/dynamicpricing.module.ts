import { Module } from '@nestjs/common';
import { DynamicPricingController } from './dynamicpricing.controller';
import { DynamicPricingService } from './dynamicpricing.service';

@Module({
  controllers: [DynamicPricingController],
  providers: [DynamicPricingService],
  exports: [DynamicPricingService],
})
export class DynamicPricingModule {}
