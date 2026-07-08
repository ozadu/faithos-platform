import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  service: 'api';
  status: 'ok';
}

@Controller()
export class AppController {
  @Get('health')
  getHealth(): HealthResponse {
    return {
      service: 'api',
      status: 'ok',
    };
  }
}
