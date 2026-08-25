import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

const QUEUE_NAMES = [
  'email', 'notifications', 'orders', 'payments', 'inventory',
  'media', 'ai', 'analytics', 'commissions', 'shipping', 'search', 'reports',
];

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          db: config.get<number>('REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
    }),
    ...QUEUE_NAMES.map(name => BullModule.registerQueue({ name })),
  ],
  exports: [BullModule],
})
export class QueueModule {}
