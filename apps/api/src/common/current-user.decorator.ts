import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedUser, RequestContext } from './authenticated-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestContext>();
    return request.user as AuthenticatedUser;
  },
);
