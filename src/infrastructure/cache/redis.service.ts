import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      db: this.configService.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis { return this.client; }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try { return JSON.parse(data) as T; } catch { return data as any; }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> { await this.client.del(key); }
  async exists(key: string): Promise<boolean> { return (await this.client.exists(key)) === 1; }
  async expire(key: string, ttl: number): Promise<void> { await this.client.expire(key, ttl); }
  async keys(pattern: string): Promise<string[]> { return this.client.keys(pattern); }
  async flushPattern(pattern: string): Promise<void> {
    const keys = await this.keys(pattern);
    if (keys.length > 0) await this.client.del(...keys);
  }
  async incr(key: string): Promise<number> { return this.client.incr(key); }
  async hset(key: string, field: string, value: any): Promise<void> {
    await this.client.hset(key, field, JSON.stringify(value));
  }
  async hget<T>(key: string, field: string): Promise<T | null> {
    const data = await this.client.hget(key, field);
    if (!data) return null;
    return JSON.parse(data);
  }
  async hgetall<T>(key: string): Promise<Record<string, T>> {
    const data = await this.client.hgetall(key);
    const result: Record<string, T> = {};
    for (const [k, v] of Object.entries(data)) {
      try { result[k] = JSON.parse(v); } catch { result[k] = v as any; }
    }
    return result;
  }
  async publish(channel: string, message: any): Promise<void> {
    await this.client.publish(channel, JSON.stringify(message));
  }
  async lpush(key: string, value: any): Promise<void> {
    await this.client.lpush(key, JSON.stringify(value));
  }
  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const items = await this.client.lrange(key, start, stop);
    return items.map(i => { try { return JSON.parse(i); } catch { return i; } });
  }
}
