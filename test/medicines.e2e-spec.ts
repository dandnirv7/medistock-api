/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-argument,
                  @typescript-eslint/no-unsafe-call,
                  @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { buildTestApp, resetDatabase } from './helpers/test-app';
import { PrismaService } from '../src/database/prisma.service';

describe('Medicines (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let categoryId: string;
  let supplierId: string;

  async function seedFixtures(): Promise<void> {
    await resetDatabase(app);
    const prisma = app.get<PrismaService>(PrismaService);
    const password = await bcrypt.hash('admin123', 4);
    await prisma.user.create({
      data: {
        name: 'Admin',
        username: 'admin',
        email: 'admin@medistock.local',
        password,
        role: 'ADMIN',
        isActive: true,
      },
    });
    const cat = await prisma.category.create({
      data: { name: 'Analgesik', isActive: true },
    });
    categoryId = cat.id;
    const sup = await prisma.supplier.create({
      data: { name: 'PT Test', isActive: true },
    });
    supplierId = sup.id;

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);
    token = login.body.data.accessToken;
  }

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await seedFixtures();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /medicines creates a medicine', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'PAR-500',
        name: 'Paracetamol 500 mg',
        categoryId,
        supplierId,
        unit: 'Tablet',
        purchasePrice: 250,
        sellingPrice: 500,
        currentStock: 20,
        minimumStock: 10,
        expiredDate: '2099-12-31',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('PAR-500');
    expect(res.body.data.currentStock).toBe(20);
  });

  it('GET /medicines returns paginated list with derived statuses', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'PAR-1',
        name: 'A',
        categoryId,
        supplierId,
        unit: 'Tablet',
        purchasePrice: 1,
        sellingPrice: 2,
        currentStock: 5,
        minimumStock: 10,
        expiredDate: '2099-12-31',
      })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get('/api/v1/medicines?lowStock=true')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].stockStatus).toBe('LOW_STOCK');
    expect(res.body.meta.total).toBe(1);
  });

  it('GET /medicines/:id returns detail', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'P-1',
        name: 'P',
        categoryId,
        supplierId,
        unit: 'Tablet',
        purchasePrice: 1,
        sellingPrice: 2,
        minimumStock: 1,
        expiredDate: '2099-12-31',
      })
      .expect(201);
    const id = create.body.data.id;
    const res = await request(app.getHttpServer())
      .get(`/api/v1/medicines/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.code).toBe('P-1');
  });

  it('PATCH /medicines/:id updates fields', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'P-1',
        name: 'P',
        categoryId,
        supplierId,
        unit: 'Tablet',
        purchasePrice: 1,
        sellingPrice: 2,
        minimumStock: 1,
        expiredDate: '2099-12-31',
      })
      .expect(201);
    const id = create.body.data.id;
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/medicines/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated', minimumStock: 99 })
      .expect(200);
    expect(res.body.data.name).toBe('Updated');
  });

  it('DELETE /medicines/:id soft-deletes', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'P-1',
        name: 'P',
        categoryId,
        supplierId,
        unit: 'Tablet',
        purchasePrice: 1,
        sellingPrice: 2,
        minimumStock: 1,
        expiredDate: '2099-12-31',
      })
      .expect(201);
    const id = create.body.data.id;
    await request(app.getHttpServer())
      .delete(`/api/v1/medicines/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    // List should no longer return the soft-deleted medicine
    const list = await request(app.getHttpServer())
      .get('/api/v1/medicines')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(
      list.body.data.find((m: { id: string }) => m.id === id),
    ).toBeUndefined();
  });

  it('POST /medicines rejects invalid categoryId with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'P-1',
        name: 'P',
        categoryId: '00000000-0000-0000-0000-000000000000',
        supplierId,
        unit: 'Tablet',
        purchasePrice: 1,
        sellingPrice: 2,
        minimumStock: 1,
        expiredDate: '2099-12-31',
      })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
