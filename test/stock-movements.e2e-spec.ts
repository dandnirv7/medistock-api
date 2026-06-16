/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-argument,
                  @typescript-eslint/no-unsafe-member-access,
                  @typescript-eslint/no-unused-vars */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { buildTestApp, resetDatabase } from './helpers/test-app';
import { PrismaService } from '../src/database/prisma.service';

describe('Stock Movements (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let staffToken: string;
  let medicine2Id: string;
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
    const med2 = await prisma.medicine.create({
      data: {
        code: 'CODE-2',
        name: 'Test Med 2',
        categoryId: cat.id,
        supplierId: sup.id,
        unit: 'Botol',
        purchasePrice: 50,
        sellingPrice: 100,
        currentStock: 20,
        minimumStock: 5,
        expiredDate: new Date('2099-12-31'),
        isActive: true,
      },
    });
    medicine2Id = med2.id;

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);
    token = login.body.data.accessToken;

    const staff = await prisma.user.create({
      data: {
        name: 'Staff',
        username: 'staff',
        password: password,
        role: 'STAFF',
        isActive: true,
      },
    });
    const staffLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'staff', password: 'admin123' })
      .expect(200);
    staffToken = staffLogin.body.data.accessToken;
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
  it('POST /stock-movements/opname sets newStock > current → IN movement', async () => {
    // currentStock seeded at 10
    const res = await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId, newStock: 25, notes: 'Opname Mei 2026' })
      .expect(201);
    expect(res.body.data.type).toBe('IN');
    expect(res.body.data.reason).toBe('ADJUSTMENT');
    expect(res.body.data.quantity).toBe(15);
    expect(res.body.data.stockBefore).toBe(10);
    expect(res.body.data.stockAfter).toBe(25);

    // Verify DB state
    const prisma = app.get<PrismaService>(PrismaService);
    const med = await prisma.medicine.findUnique({ where: { id: medicineId } });
    expect(med?.currentStock).toBe(25);
    const movements = await prisma.stockMovement.findMany({
      where: { medicineId, reason: 'ADJUSTMENT' },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0].notes).toBe('Opname Mei 2026');
  });

  it('POST /stock-movements/opname sets newStock < current → OUT movement', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId, newStock: 3 })
      .expect(201);
    expect(res.body.data.type).toBe('OUT');
    expect(res.body.data.reason).toBe('ADJUSTMENT');
    expect(res.body.data.quantity).toBe(7);
    expect(res.body.data.stockBefore).toBe(10);
    expect(res.body.data.stockAfter).toBe(3);
  });

  it('POST /stock-movements/opname rejects no-op (newStock = current)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId, newStock: 10 })
      .expect(400);
  });

  it('POST /stock-movements/opname rejects negative newStock', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId, newStock: -5 })
      .expect(400);
  });

  it('POST /stock-movements/opname 404 on unknown medicine', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname')
      .set('Authorization', `Bearer ${token}`)
      .send({
        medicineId: '00000000-0000-0000-0000-000000000000',
        newStock: 50,
      })
      .expect(404);
  });

  it('POST /stock-movements/opname 403 for STAFF', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ medicineId, newStock: 50 })
      .expect(403);
  });

  it('POST /stock-movements/opname 401 without token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname')
      .send({ medicineId, newStock: 50 })
      .expect(401);
  });

  it('ADJUSTMENT movements appear in GET /stock-movements?reason=ADJUSTMENT', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId, newStock: 20 })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get('/api/v1/stock-movements?reason=ADJUSTMENT')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].reason).toBe('ADJUSTMENT');
  });

  it('POST /stock-movements/opname/bulk applies partial success (2 ok, 1 no_change, 1 not_found)', async () => {
    // medicineId  currentStock=10, medicine2Id currentStock=20
    const res = await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { medicineId, newStock: 25, notes: 'Hilang 3 box' },
          { medicineId, newStock: 10 }, // no-op (matches current)
          { medicineId: medicine2Id, newStock: 50 },
          {
            medicineId: '00000000-0000-0000-0000-000000000000',
            newStock: 5,
          },
        ],
      })
      .expect(200);
    expect(res.body.data.data).toHaveLength(4);
    expect(res.body.data.summary).toEqual({
      total: 4,
      succeeded: 2,
      failed: 2,
    });

    const items = res.body.data.data;
    // 1st item: IN, delta 15
    expect(items[0].status).toBe('ok');
    expect(items[0].type).toBe('IN');
    expect(items[0].quantity).toBe(15);
    expect(items[0].stockBefore).toBe(10);
    expect(items[0].stockAfter).toBe(25);
    expect(items[0].movementId).toBeDefined();

    // 2nd item: no_change
    expect(items[1].status).toBe('error');
    expect(items[1].error).toBe('no_change');
    expect(items[1].message).toMatch(/sama dengan/i);

    // 3rd item: IN, delta 30
    expect(items[2].status).toBe('ok');
    expect(items[2].type).toBe('IN');
    expect(items[2].quantity).toBe(30);
    expect(items[2].stockAfter).toBe(50);

    // 4th item: not_found
    expect(items[3].status).toBe('error');
    expect(items[3].error).toBe('not_found');

    // DB state: only 2 movements written
    const prisma = app.get<PrismaService>(PrismaService);
    const movements = await prisma.stockMovement.findMany({
      where: { reason: 'ADJUSTMENT' },
    });
    expect(movements).toHaveLength(2);

    // medicine.currentStock updated
    const m1 = await prisma.medicine.findUnique({ where: { id: medicineId } });
    const m2 = await prisma.medicine.findUnique({ where: { id: medicine2Id } });
    expect(m1?.currentStock).toBe(25);
    expect(m2?.currentStock).toBe(50);
  });

  it('POST /stock-movements/opname/bulk creates OUT movement when newStock < current', async () => {
    // medicine2Id currentStock is whatever last test left (50). Reset it first.
    const prisma = app.get<PrismaService>(PrismaService);
    await prisma.medicine.update({
      where: { id: medicine2Id },
      data: { currentStock: 100 },
    });
    const res = await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ medicineId: medicine2Id, newStock: 30 }] })
      .expect(200);
    expect(res.body.data.data[0].status).toBe('ok');
    expect(res.body.data.data[0].type).toBe('OUT');
    expect(res.body.data.data[0].quantity).toBe(70);
    expect(res.body.data.data[0].stockAfter).toBe(30);
  });

  it('POST /stock-movements/opname/bulk honors transactionDate for all items', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ medicineId, newStock: 7 }],
        transactionDate: '2026-05-15',
      })
      .expect(200);
    expect(res.body.data.data[0].status).toBe('ok');

    const prisma = app.get<PrismaService>(PrismaService);
    const movement = await prisma.stockMovement.findFirst({
      where: { medicineId, reason: 'ADJUSTMENT' },
      orderBy: { createdAt: 'desc' },
    });
    // transactionDate is stored as DATE in Prisma, normalized to UTC midnight
    const expected = new Date('2026-05-15T00:00:00.000Z').toISOString();
    expect(movement?.transactionDate.toISOString()).toBe(expected);
  });

  it('POST /stock-movements/opname/bulk 403 for STAFF', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname/bulk')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ items: [{ medicineId, newStock: 1 }] })
      .expect(403);
  });

  it('POST /stock-movements/opname/bulk 401 without token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname/bulk')
      .send({ items: [{ medicineId, newStock: 1 }] })
      .expect(401);
  });

  it('POST /stock-movements/opname/bulk 400 on empty items array', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] })
      .expect(400);
  });

  it('POST /stock-movements/opname/bulk 400 when items > 500', async () => {
    const big = Array.from({ length: 501 }, () => ({
      medicineId,
      newStock: 1,
    }));
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: big })
      .expect(400);
  });

  it('POST /stock-movements/opname/bulk 400 when any item has negative newStock', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/stock-movements/opname/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ medicineId, newStock: -5 }] })
      .expect(400);
  });
});
