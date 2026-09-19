import { Module } from '@nestjs/common';
import { FlashSalesController } from './flashsales.controller';
import { FlashSalesService } from './flashsales.service';

@Module({
  controllers: [FlashSalesController],
  providers: [FlashSalesService],
  exports: [FlashSalesService],
})
export class FlashSalesModule {}
