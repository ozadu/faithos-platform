import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { RequestContext } from './authenticated-user';

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export const CurrentRequestMetadata = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestMetadata => {
    const request = context.switchToHttp().getRequest<RequestContext>();
    const userAgent = request.headers['user-agent'];

    return {
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(typeof userAgent === 'string' ? { userAgent } : {}),
    };
  },
);
