import { Test, type TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';

import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';

// @SkipThrottle() with no args defaults to { default: true }. The
// decorator writes metadata with key 'THROTTLER:SKIP' + key for each
// entry in that object, so the default key is 'THROTTLER:SKIPdefault'.
const THROTTLER_SKIP_KEY = 'THROTTLER:SKIPdefault';

describe('HealthController', () => {
  describe('class metadata', () => {
    it('is marked @Public() so smoke tests bypass the JWT guard', () => {
      const isPublic: unknown = Reflect.getMetadata(
        'isPublic',
        HealthController,
      );
      expect(isPublic).toBe(true);
    });

    it('exempts the GET /health route from throttling', () => {
      const skip: unknown = Reflect.getMetadata(
        THROTTLER_SKIP_KEY,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        HealthController.prototype.check,
      );
      // The decorator writes the truthy value `true` (not the whole
      // object) under 'THROTTLER:SKIPdefault'.
      expect(skip).toBe(true);
    });
  });

  describe('check()', () => {
    let app: INestApplication;
    let prisma: { $queryRaw: jest.Mock };

    const mockPrisma = () => ({
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    });

    beforeEach(async () => {
      prisma = mockPrisma();
      // Limit = 2/min so any handler that is NOT @SkipThrottle would
      // 429 on the 3rd request, proving the exemption is in effect.
      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 2 }]),
        ],
        controllers: [HealthController],
        providers: [{ provide: PrismaService, useValue: prisma }],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('returns ok payload when DB is reachable', async () => {
      const res = await request(app.getHttpServer() as Server).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'ok',
        database: 'up',
      });
      expect(typeof (res.body as { uptime: unknown }).uptime).toBe('number');
    });

    it('allows 5 sequential requests under a 2/min limit (SkipThrottle)', async () => {
      // With @SkipThrottle the throttler must not engage. We hit 5
      // times; without the exemption request #3 onwards would 429.
      for (let i = 0; i < 5; i++) {
        const res = await request(app.getHttpServer() as Server).get('/health');
        expect(res.status).toBe(200);
      }
    });

    it('returns 503 when DB is down', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
      const res = await request(app.getHttpServer() as Server).get('/health');
      expect(res.status).toBe(503);
    });
  });
});
