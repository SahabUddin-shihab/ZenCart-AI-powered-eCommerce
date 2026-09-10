import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentVendor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user?.vendor,
);
