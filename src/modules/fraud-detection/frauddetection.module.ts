import { Module } from '@nestjs/common';
import { FraudDetectionController } from './frauddetection.controller';
import { FraudDetectionService } from './frauddetection.service';

@Module({
  controllers: [FraudDetectionController],
  providers: [FraudDetectionService],
  exports: [FraudDetectionService],
})
export class FraudDetectionModule {}
