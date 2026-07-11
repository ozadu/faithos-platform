import { Controller, Get } from '@nestjs/common';
import { connect } from 'node:net';

import { RawResponse } from './common/raw-response.decorator';
import { PrismaService } from './database/prisma.service';

interface HealthResponse {
  database: HealthCheck;
  redis: HealthCheck;
  service: 'api';
  status: 'degraded' | 'ok';
  timestamp: string;
}

interface HealthCheck {
  message: string;
  status: 'down' | 'ok';
}

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @RawResponse()
  async getHealth(): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const status = [database, redis].every((check) => check.status === 'ok')
      ? 'ok'
      : 'degraded';

    return {
      database,
      redis,
      service: 'api',
      status,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { message: 'Database connection is healthy.', status: 'ok' };
    } catch {
      return { message: 'Database connection failed.', status: 'down' };
    }
  }

  private checkRedis(): Promise<HealthCheck> {
    const value = process.env.REDIS_URL;
    if (!value) {
      return Promise.resolve({
        message: 'REDIS_URL is not configured.',
        status: 'down',
      });
    }
    try {
      const url = new URL(value);
      const port = Number.parseInt(url.port || '6379', 10);
      return this.checkTcp(url.hostname, port, 'Redis connection is healthy.');
    } catch {
      return Promise.resolve({
        message: 'REDIS_URL is invalid.',
        status: 'down',
      });
    }
  }

  private checkTcp(
    host: string,
    port: number,
    successMessage: string,
  ): Promise<HealthCheck> {
    return new Promise((resolve) => {
      const socket = connect(port, host);
      const finish = (status: HealthCheck['status'], message: string) => {
        socket.destroy();
        resolve({ message, status });
      };
      socket.setTimeout(1_500, () => finish('down', 'Connection timed out.'));
      socket.once('connect', () => finish('ok', successMessage));
      socket.once('error', () => finish('down', 'TCP connection failed.'));
    });
  }
}
