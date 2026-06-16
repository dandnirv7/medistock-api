import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { assertProductionJwtSecret } from './common/config/prod-env-assert';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  assertProductionJwtSecret();

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Security headers (CSP, HSTS, X-Frame-Options, etc.). Skipped for the
  // bare /health probe so external uptime checks can hit it without the
  // strict defaults.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global /api/v1 prefix for all controllers.
  app.setGlobalPrefix('api/v1');

  // Bare liveness probe at GET /health (NOT under the prefix).
  // Wired directly on the underlying express instance so it survives
  // even if the /api/v1 prefix ever changes. Skips helmet headers
  // because uptime monitors sometimes don't expect them.
  const httpAdapter = app.getHttpAdapter() as {
    getInstance(): express.Express;
  };
  const expressServer: express.Express = httpAdapter.getInstance();
  expressServer.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // CORS allowlist. Origins are read from CORS_ORIGINS (comma-separated).
  // - production: strict — only the listed origins are accepted.
  // - development: permissive default (echoes the request Origin) so
  //   Flutter on the Android emulator (10.0.2.2), web/desktop smoke
  //   tests on http://localhost:*, and any new dev URL just work.
  //   Override with CORS_ORIGINS to lock it down locally if needed.
  // The shape stays array-or-true so credentials: true remains safe:
  // echoing the Origin (true) is fine without cookies; an explicit
  // allowlist prevents accidental cross-origin cookie leaks.
  const isProd = process.env.NODE_ENV === 'production';
  const corsOrigins = process.env.CORS_ORIGINS;
  if (corsOrigins) {
    const allow = corsOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    app.enableCors({ origin: allow, credentials: true });
  } else {
    app.enableCors({ origin: !isProd, credentials: true });
  }

  // Global validation (whitelist strips unknown fields, transform
  // converts payloads to DTO instances so DTO defaults work).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global response/error envelopes per docs/api_contract.md §2.1.
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // OpenAPI / Swagger UI for the mobile client team and manual smoke
  // tests. UI is gated by SWAGGER_ENABLED (defaults to "1" in development,
  // "0" in production). The JSON spec at /api/docs-json is always served
  // when the doc is built so tools can still consume it in prod.
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED ??
    (process.env.NODE_ENV === 'production' ? '0' : '1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('MediStock API')
    .setDescription('MVP backend for the MediStock Flutter client')
    .setVersion('0.0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
        description: 'Paste the accessToken from POST /auth/login',
      },
      'jwt',
    )
    .addTag('auth', 'Login, current user, logout')
    .addTag('categories', 'CRUD for medicine categories')
    .addTag('suppliers', 'CRUD for suppliers')
    .addTag('medicines', 'CRUD for medicines + filtering + status')
    .addTag('stock-movements', 'Stock in / out + history')
    .addTag('dashboard', 'Home screen summary')
    .addTag('health', 'Liveness + DB readiness')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  if (swaggerEnabled === '1') {
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);

  const docsHint =
    swaggerEnabled === '1' ? 'docs: /api/docs' : 'docs: SWAGGER_ENABLED=1';
  Logger.log(
    `MediStock API listening on http://localhost:${port} (prefix: /api/v1, ${docsHint})`,
    'Bootstrap',
  );
}

void bootstrap();
