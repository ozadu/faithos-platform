import { resolve } from 'node:path';

import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile(resolve(process.cwd(), '../../.env'));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw error;
  }
}

export default defineConfig({
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://faithos:faithos@localhost:5432/faithos',
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  schema: 'prisma/schema.prisma',
});
