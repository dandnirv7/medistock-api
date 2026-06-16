/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { buildTestApp, resetDatabase } from './helpers/test-app';
import { PrismaService } from '../src/database/prisma.service';

describe('Reports / CSV export (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let adminToken: string;
  let staffToken: string;

  async function seed(): Promise<void> {
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

    const cat = await prisma.category.create({
      data: { name: 'Analgesik', isActive: true },
    });
    const sup = await prisma.supplier.create({
      data: { name: 'PT Kimia Farma', isActive: true },
    });

    // Low stock medicine: currentStock 5, minimumStock 10
    await prisma.medicine.create({
      data: {
        code: 'LOW-1',
        name: 'Paracetamol',
        categoryId: cat.id,
        supplierId: sup.id,
        unit: 'Tablet',
        purchasePrice: 100,
        sellingPrice: 200,
        currentStock: 5,
        minimumStock: 10,
        expiredDate: new Date('2099-12-31'),
        isActive: true,
      },
    });
    // Safe medicine: currentStock 100, minimumStock 10
    await prisma.medicine.create({
      data: {
        code: 'SAFE-1',
        name: 'Amoxicillin',
        categoryId: cat.id,
        supplierId: sup.id,
        unit: 'Kapsul',
        purchasePrice: 200,
        sellingPrice: 400,
        currentStock: 100,
        minimumStock: 10,
        expiredDate: new Date('2099-12-31'),
        isActive: true,
      },
    });
    // Expiring soon medicine (in 15 days)
    const soon = new Date();
    soon.setUTCDate(soon.getUTCDate() + 15);
    await prisma.medicine.create({
      data: {
        code: 'SOON-1',
        name: 'Vitamin C',
        categoryId: cat.id,
        supplierId: sup.id,
        unit: 'Botol',
        purchasePrice: 50,
        sellingPrice: 100,
        currentStock: 20,
        minimumStock: 5,
        expiredDate: soon,
        isActive: true,
      },
    });
    // Already expired
    const expired = new Date();
    expired.setUTCDate(expired.getUTCDate() - 10);
    await prisma.medicine.create({
      data: {
        code: 'EXP-1',
        name: 'Aspirin Expired',
        categoryId: cat.id,
        supplierId: sup.id,
        unit: 'Tablet',
        purchasePrice: 80,
        sellingPrice: 150,
        currentStock: 30,
        minimumStock: 5,
        expiredDate: expired,
        isActive: true,
      },
    });

    const admin = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'password' })
      .expect(200);
    adminToken = admin.body.data.accessToken;
    const staff = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'staff', password: 'password' })
      .expect(200);
    staffToken = staff.body.data.accessToken;
  }

  beforeAll(async () => {
    app = await buildTestApp();
    server = app.getHttpServer() as Server;
  });

  beforeEach(async () => {
    await seed();
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // /reports/stock-movements.csv
  // ---------------------------------------------------------------------------

  it('GET /reports/stock-movements.csv returns CSV with BOM + header + rows', async () => {
    // Seed a stock movement first
    const prisma = app.get<PrismaService>(PrismaService);
    const med = await prisma.medicine.findFirstOrThrow({
      where: { code: 'SAFE-1' },
    });
    await request(server)
      .post('/api/v1/stock-movements/in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ medicineId: med.id, quantity: 10 })
      .expect(201);

    const res = await request(server)
      .get('/api/v1/reports/stock-movements.csv')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment.*\.csv/);

    // UTF-8 BOM check
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    const body = res.text.slice(1);
    const lines = body.trim().split('\n');
    expect(lines[0]).toContain('movementId');
    expect(lines[0]).toContain('medicineCode');
    expect(lines[0]).toContain('medicineName');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('GET /reports/stock-movements.csv filters by date range', async () => {
    const prisma = app.get<PrismaService>(PrismaService);
    const med = await prisma.medicine.findFirstOrThrow({
      where: { code: 'SAFE-1' },
    });
    await request(server)
      .post('/api/v1/stock-movements/in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ medicineId: med.id, quantity: 5 })
      .expect(201);

    // startDate in the future: no matches
    const res = await request(server)
      .get('/api/v1/reports/stock-movements.csv?startDate=2099-01-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const lines = res.text.slice(1).trim().split('\n');
    // header only
    expect(lines).toHaveLength(1);
  });

  it('GET /reports/stock-movements.csv 403 for STAFF', async () => {
    await request(server)
      .get('/api/v1/reports/stock-movements.csv')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('GET /reports/stock-movements.csv 401 without token', async () => {
    await request(server)
      .get('/api/v1/reports/stock-movements.csv')
      .expect(401);
  });

  // ---------------------------------------------------------------------------
  // /reports/low-stock.csv
  // ---------------------------------------------------------------------------

  it('GET /reports/low-stock.csv only emits medicines with currentStock <= minimumStock', async () => {
    const res = await request(server)
      .get('/api/v1/reports/low-stock.csv')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    const lines = res.text.slice(1).trim().split('\n');
    expect(lines[0]).toContain('medicineId');
    expect(lines[0]).toContain('currentStock');
    expect(lines[0]).toContain('minimumStock');
    // 4 medicines seeded, only LOW-1 has currentStock <= minimumStock
    expect(lines).toHaveLength(2); // header + 1 data row
    expect(res.text).toContain('LOW-1');
    expect(res.text).not.toContain('SAFE-1');
  });

  it('GET /reports/low-stock.csv 403 for STAFF', async () => {
    await request(server)
      .get('/api/v1/reports/low-stock.csv')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  // ---------------------------------------------------------------------------
  // /reports/expired-soon.csv
  // ---------------------------------------------------------------------------

  it('GET /reports/expired-soon.csv emits medicines within 30 days (excludes already-expired)', async () => {
    const res = await request(server)
      .get('/api/v1/reports/expired-soon.csv')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    const lines = res.text.slice(1).trim().split('\n');
    expect(lines[0]).toContain('daysUntilExpiry');
    // SOON-1 (+15 days) qualifies, EXP-1 (-10 days, already expired) does NOT
    // (already-expired medicines belong in a separate "expired" report if
    // we ever ship one).
    expect(lines).toHaveLength(2); // header + 1 data row
    expect(res.text).toContain('SOON-1');
    expect(res.text).not.toContain('EXP-1');
    expect(res.text).not.toContain('SAFE-1');
    expect(res.text).not.toContain('LOW-1');
  });

  it('GET /reports/expired-soon.csv honors ?now override', async () => {
    // With now=today+60, soon=today+90. SOON-1 (today+15) is in the past
    // relative to now, so it's excluded by the gte=today filter. No rows
    // should match.
    const farFuture = new Date();
    farFuture.setUTCDate(farFuture.getUTCDate() + 60);
    const iso = farFuture.toISOString();
    const res = await request(server)
      .get(`/api/v1/reports/expired-soon.csv?now=${encodeURIComponent(iso)}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const lines = res.text.slice(1).trim().split('\n');
    expect(lines).toHaveLength(1); // header only
    expect(res.text).not.toContain('SOON-1');
    expect(res.text).not.toContain('EXP-1');
  });

  it('GET /reports/expired-soon.csv 403 for STAFF', async () => {
    await request(server)
      .get('/api/v1/reports/expired-soon.csv')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('GET /reports/expired-soon.csv 401 without token', async () => {
    await request(server).get('/api/v1/reports/expired-soon.csv').expect(401);
  });

  // ---------------------------------------------------------------------------
  // CSV escaping: notes field with comma / quote / newline
  // ---------------------------------------------------------------------------

  it('CSV correctly escapes notes with commas and quotes', async () => {
    const prisma = app.get<PrismaService>(PrismaService);
    const med = await prisma.medicine.findFirstOrThrow({
      where: { code: 'SAFE-1' },
    });
    await request(server)
      .post('/api/v1/stock-movements/in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        medicineId: med.id,
        quantity: 1,
        notes: 'Restock, urgent "ASAP"\nLantai 2',
      })
      .expect(201);

    const res = await request(server)
      .get('/api/v1/reports/stock-movements.csv')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    // csv-stringify should quote the field because of the comma + newline
    expect(res.text).toMatch(/"Restock, urgent ""ASAP""\nLantai 2"/);
  });
});
