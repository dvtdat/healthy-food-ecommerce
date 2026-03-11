import type { ExecutionContext } from '@nestjs/common';
// eslint-disable-next-line no-duplicate-imports
import { createParamDecorator } from '@nestjs/common';
import type { UserRole } from 'src/entities';

export interface CurrentUserData {
  _id: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
