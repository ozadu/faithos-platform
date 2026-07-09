import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'faithos:raw-response';
export const RawResponse = (): MethodDecorator =>
  SetMetadata(RAW_RESPONSE_KEY, true);
