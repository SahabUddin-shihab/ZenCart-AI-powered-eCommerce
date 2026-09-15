import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { VendorAnalyticsService } from './vendor-analytics.service';
import { VendorOnboardingService } from './vendor-onboarding.service';

@Module({
  controllers: [VendorsController],
  providers: [VendorsService, VendorAnalyticsService, VendorOnboardingService],
  exports: [VendorsService],
})
export class VendorsModule {}
