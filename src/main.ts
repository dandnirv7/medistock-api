import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Global /api/v1 prefix for all controllers.
  app.setGlobalPrefix('api/v1');

  // Bare liveness probe at GET /health (NOT under the prefix).
  // Wired directly on the underlying express instance so it survives
  // even if the /api/v1 prefix ever changes.
  const httpAdapter = app.getHttpAdapter() as {
    getInstance(): express.Express;
  };
  const expressServer: express.Express = httpAdapter.getInstance();
  expressServer.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // CORS — open for Flutter dev (Android emulator uses 10.0.2.2 and
  // also http://localhost:* during web/desktop smoke tests).
  app.enableCors({
    origin: true,
    credentials: true,
  });

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

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);

  Logger.log(
    `MediStock API listening on http://localhost:${port} (prefix: /api/v1)`,
    'Bootstrap',
  );
}

void bootstrap();
