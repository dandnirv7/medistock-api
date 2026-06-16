import { config as loadEnv } from 'dotenv';
import { defineConfig } from '@prisma/config';

// Load .env from the project root so DATABASE_URL is available to the
// CLI even when it's invoked from a sub-shell that doesn't auto-load it.
loadEnv({ path: '.env' });

/**
 * Prisma 7 configuration.
 *
 * - `datasource.url` is the single source of truth for the connection
 *   string. It is used by the CLI for migrations, `db execute`, and
 *   `db seed`, and it is the value baked into the generated client.
 * - The Prisma Client at runtime is also built with a `PrismaPg` driver
 *   adapter (see `src/database/prisma.service.ts`) since v7 no longer
 *   reads the URL "by magic" inside the client.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for Prisma config');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
