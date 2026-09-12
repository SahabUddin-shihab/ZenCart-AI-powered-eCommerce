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
    CategoriesModule
    
  ],
})
export class AppModule {}
