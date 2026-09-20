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
import { CouponsModule } from './modules/coupons/coupons.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AiModule } from './modules/ai/ai.module';
import { DynamicPricingModule } from './modules/dynamic-pricing/dynamic-pricing.module';
import { TaxationModule } from './modules/taxation/taxation.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { FraudDetectionModule } from './modules/fraud-detection/fraud-detection.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { SearchModule } from '@infrastructure/search/search.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { AffiliateModule } from '@modules/affiliate/affiliate.module';
import { ReviewsModule } from '@modules/reviews/reviews.module';
import { BlogsModule } from '@modules/blogs/blogs.module';
import { CmsModule } from '@modules/cms/cms.module';
import { SeoModule } from '@modules/seo/seo.module';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { AuditModule } from '@modules/audit/audit.module';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { ReportsModule } from '@modules/reports/reports.module';
import { FlashSalesModule } from '@modules/flash-sales/flash-sales.module';
import { SupportModule } from '@modules/support/support.module';
import { ErpModule } from '@modules/erp/erp.module';
import { WarehouseModule } from '@modules/warehouse/warehouse.module';
import { InfluencerModule } from '@modules/influencer/influencer.module';
import { LoyaltyModule } from '@modules/loyalty/loyalty.module';
import { FeatureFlagsModule } from '@modules/feature-flags/featureflags.module';
import { AbTestingModule } from '@modules/ab-testing/ab-testing.module';
import { AutomationModule } from '@modules/automation/automation.module';
import { WebhooksModule } from '@modules/webhooks/webhooks.module';
import { WorkflowsModule } from '@modules/workflows/workflows.module';

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
    SearchModule,
    StorageModule,

    // Feature Modules
    AuthModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    UsersModule,
    OrdersModule,
    VendorsModule,
    InventoryModule,
    CouponsModule,
    CampaignsModule,
    AiModule,
    DynamicPricingModule,
    TaxationModule,
    ShippingModule,
    FraudDetectionModule,
    CheckoutModule,
    PaymentsModule,
    AffiliateModule,
    ReviewsModule,
    BlogsModule,
    CmsModule,
    SeoModule,
    PermissionsModule,
    AuditModule,
    AnalyticsModule,
    ReportsModule,
    FlashSalesModule,
    SupportModule,
    ErpModule,
    WarehouseModule,
    InfluencerModule,
    LoyaltyModule,
    FeatureFlagsModule,
    AbTestingModule,
    AutomationModule,
    WebhooksModule,
    WorkflowsModule
    
  ],
})
export class AppModule {}
