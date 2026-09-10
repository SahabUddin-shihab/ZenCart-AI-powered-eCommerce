import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    if (req.method !== 'GET') return next.handle();

    const cacheKey = `http:${req.url}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return of(cached);

    return next.handle().pipe(
      tap(async (data) => {
        await this.redis.set(cacheKey, data, 300);
      }),
    );
  }
}
