import { Module } from '@nestjs/common';
import { FeatureFlagsController } from './featureflags.controller';
import { FeatureFlagsService } from './featureflags.service';

@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
