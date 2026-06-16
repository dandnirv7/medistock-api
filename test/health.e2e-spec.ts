/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';

import { buildTestApp } from './helpers/test-app';

describe('Health & wiring (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    app = await buildTestApp();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns the wrapped envelope with DB status', async () => {
    const res = await request(server).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Success',
      data: {
        status: 'ok',
        database: 'up',
        uptime: expect.any(Number),
      },
    });
  });

  it('ResponseInterceptor wraps arbitrary controller payloads', async () => {
    const res = await request(server).get('/api/v1/health');
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('data');
    expect(res.body).not.toHaveProperty('error');
  });
});
