import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { MedicinesModule } from './medicines/medicines.module';
import { ReportsModule } from './reports/reports.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { SuppliersModule } from './suppliers/suppliers.module';

type ThrottlerEnv = 'production' | 'development' | 'test';
const env = (process.env.NODE_ENV ?? 'development') as ThrottlerEnv;

// Throttle limits can be overridden via env vars so operators can
// raise them for internal/demo deployments without code changes:
//   THROTTLE_DEFAULT_LIMIT  — per-minute cap for the global 'default' bucket
//   THROTTLE_LOGIN_LIMIT    — per-minute cap for the login route only
//                             (applied in auth.controller.ts, overrides
//                             the 'default' bucket on POST /auth/login)
//   THROTTLE_TEST_LIMIT     — per-minute cap in NODE_ENV=test
// When unset, each env uses a sensible preset:
//   - test        : 1_000_000/min (e2e suites need to hammer routes).
//   - development : 10_000/min   (single dev workstation, no spam).
//   - production  : 60/min       (mirrors real-world brute-force defence).
// jest-e2e.json's setupFiles sets NODE_ENV=test before any module import.
function readLimit(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
const defaultLimit = readLimit(
  'THROTTLE_DEFAULT_LIMIT',
  env === 'production' ? 60 : env === 'test' ? 1_000_000 : 10_000,
);
const testLimit = readLimit('THROTTLE_TEST_LIMIT', 1_000_000);

// IMPORTANT: register exactly ONE global throttler ('default').
// @nestjs/throttler v6 applies EVERY named throttler declared here to
// EVERY route (they must all pass). A second global 'login' bucket would
// therefore cap *all* endpoints at the login limit (5/min), not just
// /auth/login — which is exactly the bug that produced 429s across the
// app. The strict login limit lives on the login route itself, where it
// overrides the 'default' bucket only for that handler.
const throttlerConfig = (() => {
  switch (env) {
    case 'test':
      return [{ name: 'default', ttl: 60_000, limit: testLimit }];
    case 'development':
    case 'production':
    default:
      return [{ name: 'default', ttl: 60_000, limit: defaultLimit }];
  }
})();

@Module({
  imports: [
    ThrottlerModule.forRoot(throttlerConfig),
    DatabaseModule,
    AuthModule,
    HealthModule,
    CategoriesModule,
    SuppliersModule,
    MedicinesModule,
    StockMovementsModule,
    ReportsModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
