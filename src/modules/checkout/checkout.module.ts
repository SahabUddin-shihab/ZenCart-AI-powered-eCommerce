import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { TaxationModule } from '../taxation/taxation.module';
import { ShippingModule } from '../shipping/shipping.module';
import { CouponsModule } from '../coupons/coupons.module';
import { FraudDetectionModule } from '../fraud-detection/fraud-detection.module';

@Module({
  imports: [TaxationModule, ShippingModule, CouponsModule, FraudDetectionModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
