import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { PrismaService } from '../../src/database/prisma.service';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/medistock_test?schema=public';

/**
 * Builds a Nest app identical to main.ts (same pipes/interceptor/filter,
 * same /api/v1 prefix) so e2e tests exercise the full request pipeline.
 * Forces NODE_ENV=test and SWAGGER_ENABLED=1 before importing AppModule
 * so the throttler lifts its cap and SwaggerModule.setup is reached.
 */
export async function buildTestApp(): Promise<INestApplication> {
  process.env.NODE_ENV = 'test';
  process.env.SWAGGER_ENABLED = '1';
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1d';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return app;
}

/**
 * Truncate all tables. Schema uses `onDelete: Restrict` on every relation,
 * so we drop children first, parents last. We use the typed `$executeRaw`
 * with a tagged template (required by the PrismaPg driver adapter) instead
 * of `$executeRawUnsafe`.
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get<PrismaService>(PrismaService);
  // Drop in FK-safe order. RESTART IDENTITY resets the UUID-generating
  // sequences so each test starts from a clean slate.
  await prisma.stockMovement.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
}
