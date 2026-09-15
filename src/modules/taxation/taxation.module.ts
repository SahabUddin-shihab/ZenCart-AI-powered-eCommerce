import { Module } from '@nestjs/common';
import { TaxationController } from './taxation.controller';
import { TaxationService } from './taxation.service';

@Module({
  controllers: [TaxationController],
  providers: [TaxationService],
  exports: [TaxationService],
})
export class TaxationModule {}
