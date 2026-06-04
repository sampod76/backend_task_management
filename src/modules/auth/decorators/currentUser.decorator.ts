import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthPayload } from '../auth.types';

export const CurrentUser = createParamDecorator(
  (_data, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthPayload;
  },
);
