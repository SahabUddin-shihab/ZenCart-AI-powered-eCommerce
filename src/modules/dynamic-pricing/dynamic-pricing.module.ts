import { Module } from '@nestjs/common';
import { DynamicPricingController } from './dynamic-pricing.controller';
import { DynamicPricingService } from './dynamic-pricing.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [DynamicPricingController],
  providers: [DynamicPricingService],
  exports: [DynamicPricingService],
})
export class DynamicPricingModule {}
