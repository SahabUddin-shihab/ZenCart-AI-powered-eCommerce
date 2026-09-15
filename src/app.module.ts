import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';


// Infrastructure
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheInfraModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { StorageModule } from './infrastructure/storage/storage.module';


// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './shared/brands/brands.module';
import { ProductsModule } from './modules/products/products.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { InventoryModule } from './modules/inventory/inventory.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Infrastructure
    DatabaseModule,
    CacheInfraModule,
    QueueModule,
    StorageModule,


    // Feature Modules
    AuthModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    UsersModule,
    OrdersModule,
    VendorsModule,
    InventoryModule
    
  ],
})
export class AppModule {}
