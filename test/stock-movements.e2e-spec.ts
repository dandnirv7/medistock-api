/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-argument,
                  @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { buildTestApp, resetDatabase } from './helpers/test-app';
import { PrismaService } from '../src/database/prisma.service';

describe('Stock Movements (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let medicineId: string;
  let supplierId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
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
      data: { name: 'X', isActive: true },
    });
    const sup = await prisma.supplier.create({
      data: { name: 'S', isActive: true },
    });
    supplierId = sup.id;
    const med = await prisma.medicine.create({
      data: {
        code: 'CODE-1',
        name: 'Test Med',
        categoryId: cat.id,
        supplierId: sup.id,
        unit: 'Tablet',
        purchasePrice: 100,
        sellingPrice: 200,
        currentStock: 10,
        minimumStock: 5,
        expiredDate: new Date('2099-12-31'),
        isActive: true,
      },
    });
    medicineId = med.id;

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);
    token = login.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /stock-movements/in adds stock and records IN/PURCHASE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/stock-movements/in')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId, quantity: 5, supplierId })
      .expect(201);
    expect(res.body.data.type).toBe('IN');
    expect(res.body.data.reason).toBe('PURCHASE');
    expect(res.body.data.stockAfter).toBe(15);
  });

  it('POST /stock-movements/out subtracts stock', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/stock-movements/out')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId, quantity: 3, reason: 'SALE' })
      .expect(201);
    expect(res.body.data.type).toBe('OUT');
    expect(res.body.data.stockAfter).toBe(7);
  });

  it('POST /stock-movements/out fails with INSUFFICIENT_STOCK', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/stock-movements/out')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId, quantity: 9999, reason: 'SALE' })
      .expect(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.error.details.availableStock).toBe(10);
    expect(res.body.error.details.requestedQuantity).toBe(9999);
  });

  it('GET /stock-movements returns paginated list with nested medicine/user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/in')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId, quantity: 1, supplierId })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get('/api/v1/stock-movements')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].medicine).toBeDefined();
    expect(res.body.data[0].user).toBeDefined();
    expect(res.body.meta.total).toBeGreaterThan(0);
  });
});
