/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { buildTestApp, resetDatabase } from './helpers/test-app';
import { PrismaService } from '../src/database/prisma.service';

describe('User management + self-service (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let adminToken: string;
  let adminId: string;
  let staffToken: string;
  let staffId: string;

  async function seed(): Promise<void> {
    await resetDatabase(app);
    const prisma = app.get<PrismaService>(PrismaService);
    const hash = await bcrypt.hash('password', 4);
    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        username: 'admin',
        email: 'admin@medistock.local',
        password: hash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    const staff = await prisma.user.create({
      data: {
        name: 'Staff',
        username: 'staff',
        password: hash,
        role: 'STAFF',
        isActive: true,
      },
    });
    adminId = admin.id;
    staffId = staff.id;
    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'password' })
      .expect(200);
    adminToken = adminLogin.body.data.accessToken;
    const staffLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'staff', password: 'password' })
      .expect(200);
    staffToken = staffLogin.body.data.accessToken;
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
  // Admin: list / get / create / update / delete / reset
  // ---------------------------------------------------------------------------

  it('GET /auth/users as ADMIN returns paginated users (no password)', async () => {
    const res = await request(server)
      .get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data[0]).not.toHaveProperty('password');
  });

  it('GET /auth/users as STAFF returns 403', async () => {
    await request(server)
      .get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('GET /auth/users?role=ADMIN filters correctly', async () => {
    const res = await request(server)
      .get('/api/v1/auth/users?role=ADMIN')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].role).toBe('ADMIN');
  });

  it('GET /auth/users/:id returns single user, 404 if missing', async () => {
    const ok = await request(server)
      .get(`/api/v1/auth/users/${staffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(ok.body.data.username).toBe('staff');
    await request(server)
      .get('/api/v1/auth/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('POST /auth/users creates a user, password is hashed in DB', async () => {
    const res = await request(server)
      .post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Staff',
        username: 'newstaff',
        email: 'new@medistock.local',
        password: 'newpass123',
        role: 'STAFF',
      })
      .expect(201);
    expect(res.body.data.username).toBe('newstaff');
    expect(res.body.data).not.toHaveProperty('password');

    // Verify password is bcrypt-hashed in DB
    const prisma = app.get<PrismaService>(PrismaService);
    const dbUser = await prisma.user.findUnique({
      where: { username: 'newstaff' },
    });
    expect(dbUser?.password).toMatch(/^\$2[ab]\$/);
    expect(dbUser?.password).not.toBe('newpass123');

    // Verify they can login with the new password
    await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'newstaff', password: 'newpass123' })
      .expect(200);
  });

  it('POST /auth/users with duplicate username returns 409', async () => {
    await request(server)
      .post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dup',
        username: 'admin',
        password: 'newpass123',
        role: 'STAFF',
      })
      .expect(409);
  });

  it('POST /auth/users with weak password returns 400', async () => {
    await request(server)
      .post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Weak',
        username: 'weakpw',
        password: 'short',
        role: 'STAFF',
      })
      .expect(400);
  });

  it('PATCH /auth/users/:id updates fields, returns updated user', async () => {
    const res = await request(server)
      .patch(`/api/v1/auth/users/${staffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Staff Updated', role: 'ADMIN' })
      .expect(200);
    expect(res.body.data.name).toBe('Staff Updated');
    expect(res.body.data.role).toBe('ADMIN');
  });

  it('PATCH /auth/users/:id rejects username change via whitelist', async () => {
    await request(server)
      .patch(`/api/v1/auth/users/${staffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'newusername' })
      .expect(400);
  });

  it('PATCH /auth/users/:id as STAFF returns 403', async () => {
    await request(server)
      .patch(`/api/v1/auth/users/${adminId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Hacked' })
      .expect(403);
  });

  it('DELETE /auth/users/:id soft-deletes (isActive=false), blocks re-login', async () => {
    const res = await request(server)
      .delete(`/api/v1/auth/users/${staffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data).toBeNull();

    const prisma = app.get<PrismaService>(PrismaService);
    const dbUser = await prisma.user.findUnique({ where: { id: staffId } });
    expect(dbUser?.isActive).toBe(false);

    // Login as the deactivated user should fail
    await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'staff', password: 'password' })
      .expect(401);
  });

  it('DELETE /auth/users/:self returns 400', async () => {
    await request(server)
      .delete(`/api/v1/auth/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('POST /auth/users/:id/reset-password returns new password, user can log in', async () => {
    const res = await request(server)
      .post(`/api/v1/auth/users/${staffId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'brandnew123' })
      .expect(200);
    expect(res.body.data.newPassword).toBe('brandnew123');

    await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'staff', password: 'brandnew123' })
      .expect(200);
  });

  // ---------------------------------------------------------------------------
  // Self-service: profile + change password
  // ---------------------------------------------------------------------------

  it('PATCH /auth/me updates own name + email', async () => {
    const res = await request(server)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Staff Renamed', email: 'staff2@medistock.local' })
      .expect(200);
    expect(res.body.data.name).toBe('Staff Renamed');
    expect(res.body.data.email).toBe('staff2@medistock.local');
  });

  it('PATCH /auth/me rejects extra fields like role (whitelist)', async () => {
    // ValidationPipe has forbidNonWhitelisted: true, so unknown fields
    // (role, isActive) cause 400. The user cannot escalate.
    const res = await request(server)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Staff', role: 'ADMIN' })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /auth/me with only allowed fields succeeds', async () => {
    const res = await request(server)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Staff Renamed' })
      .expect(200);
    expect(res.body.data.name).toBe('Staff Renamed');
    expect(res.body.data.role).toBe('STAFF');
  });

  it('POST /auth/me/change-password rejects wrong old password', async () => {
    await request(server)
      .post('/api/v1/auth/me/change-password')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ oldPassword: 'wrong', newPassword: 'newpass456' })
      .expect(401);
  });

  it('POST /auth/me/change-password works, then login with new password', async () => {
    await request(server)
      .post('/api/v1/auth/me/change-password')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ oldPassword: 'password', newPassword: 'newpass456' })
      .expect(200);
    // Old password no longer works
    await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'staff', password: 'password' })
      .expect(401);
    // New password works
    await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'staff', password: 'newpass456' })
      .expect(200);
  });

  it('POST /auth/me/change-password without token returns 401', async () => {
    await request(server)
      .post('/api/v1/auth/me/change-password')
      .send({ oldPassword: 'password', newPassword: 'newpass456' })
      .expect(401);
  });
});
