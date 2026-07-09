import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';

import { ApiSuccess, MessageResponse } from './api-response';
import { RAW_RESPONSE_KEY } from './raw-response.decorator';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T | MessageResponse<T>,
  T | ApiSuccess<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T | MessageResponse<T>>,
  ): Observable<T | ApiSuccess<T>> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (raw) {
      return next.handle() as Observable<T>;
    }

    return next.handle().pipe(
      map((result) => {
        const response = this.isMessageResponse(result)
          ? result
          : { data: result, message: 'Request completed successfully' };

        return {
          data: response.data,
          message: response.message,
          meta: response.meta ?? {},
          success: true,
        };
      }),
    );
  }

  private isMessageResponse(value: unknown): value is MessageResponse<T> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'data' in value &&
      'message' in value
    );
  }
}
