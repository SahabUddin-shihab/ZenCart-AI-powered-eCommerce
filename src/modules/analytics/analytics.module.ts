import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventsListener } from './analytics-events.listener';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsEventsListener],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
