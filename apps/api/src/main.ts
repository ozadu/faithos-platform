import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { resolve } from 'node:path';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/http-exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';

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
  app.setGlobalPrefix('api/v1', {
    exclude: [{ method: RequestMethod.GET, path: 'health' }],
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FaithOS API')
    .setDescription('FaithOS identity and DocRoute API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const host = process.env.HOST ?? '0.0.0.0';
  const port = Number.parseInt(process.env.PORT ?? '3001', 10);

  await app.listen(port, host);
}

void bootstrap();
