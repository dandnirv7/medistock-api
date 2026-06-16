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
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { SuppliersModule } from './suppliers/suppliers.module';

type ThrottlerEnv = 'production' | 'development' | 'test';
const env = (process.env.NODE_ENV ?? 'development') as ThrottlerEnv;

// Three presets:
//   - production  : strict defaults (60/min) + brute-force login (5/min).
//   - development : relaxed defaults (600/min) so the Flutter client
//                   integration loop doesn't trip the cap. Login is still
//                   throttled at 5/min to mirror production behaviour.
//   - test        : effectively unlimited so e2e suites can hammer routes.
// jest-e2e.json's setupFiles sets NODE_ENV=test before any module import.
const throttlerConfig = (() => {
  switch (env) {
    case 'test':
      return [{ name: 'default', ttl: 60_000, limit: 1_000_000 }];
    case 'development':
      return [
        { name: 'default', ttl: 60_000, limit: 600 },
        { name: 'login', ttl: 60_000, limit: 5 },
      ];
    case 'production':
    default:
      return [
        { name: 'default', ttl: 60_000, limit: 60 },
        { name: 'login', ttl: 60_000, limit: 5 },
      ];
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
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
