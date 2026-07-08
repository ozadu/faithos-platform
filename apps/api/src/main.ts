import { NestFactory } from '@nestjs/core';
import { resolve } from 'node:path';

import { AppModule } from './app.module';

function loadLocalEnvironment(): void {
  try {
    process.loadEnvFile(resolve(__dirname, '../../../.env'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

async function bootstrap(): Promise<void> {
  loadLocalEnvironment();

  const app = await NestFactory.create(AppModule);
  const host = process.env.HOST ?? '0.0.0.0';
  const port = Number.parseInt(process.env.PORT ?? '3001', 10);

  await app.listen(port, host);
}

void bootstrap();
