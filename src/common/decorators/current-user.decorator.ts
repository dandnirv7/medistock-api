import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../types/auth-user.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    if (!request.user) {
      throw new Error('CurrentUser used on an unauthenticated route');
    }
    return request.user;
  },
);
