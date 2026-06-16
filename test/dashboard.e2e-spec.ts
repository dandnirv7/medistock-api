/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-argument,
                  @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { buildTestApp, resetDatabase } from './helpers/test-app';
import { PrismaService } from '../src/database/prisma.service';

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  async function seedFullData(): Promise<void> {
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
    const cat = await prisma.category.create({
      data: { name: 'C', isActive: true },
    });
    const sup = await prisma.supplier.create({
      data: { name: 'S', isActive: true },
    });
    // 5 medicines: 1 low stock, 1 expired, 1 near expiry, 2 healthy
    const today = new Date();
    const future = (days: number): Date =>
      new Date(today.getTime() + days * 86400000);
    const past = (days: number): Date =>
      new Date(today.getTime() - days * 86400000);
    await prisma.medicine.create({
      data: {
        code: 'LOW-1',
        name: 'Low Stock',
        categoryId: cat.id,
        supplierId: sup.id,
        unit: 'Tablet',
        purchasePrice: 1,
        sellingPrice: 2,
        currentStock: 2,
        minimumStock: 10,
        expiredDate: future(180),
        isActive: true,
      },
    });
    await prisma.medicine.create({
      data: {
        code: 'EXP-1',
        name: 'Expired',
        categoryId: cat.id,
        supplierId: sup.id,
        unit: 'Tablet',
        purchasePrice: 1,
        sellingPrice: 2,
        currentStock: 50,
        minimumStock: 10,
        expiredDate: past(5),
        isActive: true,
      },
    });
    await prisma.medicine.create({
      data: {
        code: 'NEAR-1',
        name: 'Near Expiry',
        categoryId: cat.id,
        supplierId: sup.id,
        unit: 'Tablet',
        purchasePrice: 1,
        sellingPrice: 2,
        currentStock: 50,
        minimumStock: 10,
        expiredDate: future(15),
        isActive: true,
      },
    });
    await prisma.medicine.create({
      data: {
        code: 'OK-1',
        name: 'OK 1',
        categoryId: cat.id,
        supplierId: sup.id,
        unit: 'Tablet',
        purchasePrice: 1,
        sellingPrice: 2,
        currentStock: 100,
        minimumStock: 10,
        expiredDate: future(180),
        isActive: true,
      },
    });
    await prisma.medicine.create({
      data: {
        code: 'OK-2',
        name: 'OK 2',
        categoryId: cat.id,
        supplierId: sup.id,
        unit: 'Tablet',
        purchasePrice: 1,
        sellingPrice: 2,
        currentStock: 50,
        minimumStock: 10,
        expiredDate: future(365),
        isActive: true,
      },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'password' })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;
  }

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await seedFullData();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /dashboard/summary requires auth', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .expect(401);
  });

  it('GET /dashboard/summary returns aggregate counts', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.totalMedicines).toBe(5);
    expect(res.body.data.totalCategories).toBe(1);
    expect(res.body.data.totalSuppliers).toBe(1);
    expect(res.body.data.totalStock).toBe(2 + 50 + 50 + 100 + 50);
    expect(res.body.data.lowStockCount).toBe(1);
    expect(res.body.data.expiredCount).toBe(1);
    expect(res.body.data.expiredSoonCount).toBe(1);
  });

  it('GET /dashboard/summary includes low-stock medicine detail', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const low = res.body.data.lowStockMedicines;
    expect(low).toHaveLength(1);
    expect(low[0].code).toBe('LOW-1');
    expect(low[0].currentStock).toBe(2);
    expect(low[0].minimumStock).toBe(10);
  });

  it('GET /dashboard/summary includes expired-soon medicine detail', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const near = res.body.data.expiredSoonMedicines;
    expect(near).toHaveLength(1);
    expect(near[0].code).toBe('NEAR-1');
    expect(near[0].expiredDate).toBeDefined();
  });
});
