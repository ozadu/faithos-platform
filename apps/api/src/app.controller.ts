import { Controller, Get } from '@nestjs/common';

import { RawResponse } from './common/raw-response.decorator';

interface HealthResponse {
  service: 'api';
  status: 'ok';
}

@Controller()
export class AppController {
  @Get('health')
  @RawResponse()
  getHealth(): HealthResponse {
    return {
      service: 'api',
      status: 'ok',
    };
  }
}
