import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductImportService } from './product-import.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductImportService],
  exports: [ProductsService],
})
export class ProductsModule {}
