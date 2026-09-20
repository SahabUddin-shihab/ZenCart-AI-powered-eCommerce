import { Module } from '@nestjs/common';
import { AbTestingController } from './abtesting.controller';
import { AbTestingService } from './abtesting.service';

@Module({
  controllers: [AbTestingController],
  providers: [AbTestingService],
  exports: [AbTestingService],
})
export class AbTestingModule {}
