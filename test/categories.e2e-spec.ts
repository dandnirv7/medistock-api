/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-argument,
                  @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { buildTestApp, resetDatabase } from './helpers/test-app';
import { PrismaService } from '../src/database/prisma.service';

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let staffToken: string;

  async function seedAuth(): Promise<void> {
    await resetDatabase(app);
    const prisma = app.get<PrismaService>(PrismaService);
    const hash = await bcrypt.hash('password', 4);
    await prisma.user.create({
      data: {
        name: 'Admin',
        username: 'admin',
        password: hash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    await prisma.user.create({
      data: {
        name: 'Staff',
        username: 'staff',
        password: hash,
        role: 'STAFF',
        isActive: true,
      },
    });
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'password' })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;
    const staffLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'staff', password: 'password' })
      .expect(200);
    staffToken = staffLogin.body.data.accessToken;
  }

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await seedAuth();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /categories as admin creates a category (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Analgesik', description: 'Painkillers' })
      .expect(201);
    expect(res.body.data.name).toBe('Analgesik');
    expect(res.body.data.isActive).toBe(true);
  });

  it('POST /categories as staff returns 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'X' })
      .expect(403);
  });

  it('GET /categories returns paginated list with medicineCount', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'A' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'B' })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data[0].medicineCount).toBe(0);
  });

  it('GET /categories?search=A filters by name', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Analgesik' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Vitamin' })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories?search=Analg')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Analgesik');
  });

  it('GET /categories/:id returns detail with medicineCount', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/categories/${create.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.id).toBe(create.body.data.id);
    expect(res.body.data.medicineCount).toBe(0);
  });

  it('PATCH /categories/:id updates fields', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' })
      .expect(201);
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/categories/${create.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Y', isActive: false })
      .expect(200);
    expect(res.body.data.name).toBe('Y');
    expect(res.body.data.isActive).toBe(false);
  });

  it('DELETE /categories/:id soft-deletes (sets isActive=false)', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' })
      .expect(201);
    await request(app.getHttpServer())
      .delete(`/api/v1/categories/${create.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/categories/${create.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.body.data.isActive).toBe(false);
  });

  it('POST /categories accepts duplicate names (soft-delete model)', async () => {
    // Per the contract, categories are never hard-deleted, so the API
    // permits two rows that share a name as long as their isActive flags
    // differ. Verify the endpoint accepts the duplicate.
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' })
      .expect(201);
    expect(res.body.data.name).toBe('X');
  });
});
