import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let jwt: { signAsync: jest.Mock };

  const fakeUser = {
    id: 'user-1',
    name: 'Admin Apotek',
    username: 'admin',
    email: 'admin@medistock.local',
    role: 'ADMIN' as const,
    isActive: true,
    password: bcrypt.hashSync('admin123', 4),
  };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('logs in with valid credentials and returns accessToken + user', async () => {
    prisma.user.findUnique.mockResolvedValue(fakeUser);
    const dto: LoginDto = { username: 'admin', password: 'admin123' };
    const result = await service.login(dto);
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user.username).toBe('admin');
    expect(result.user.role).toBe('ADMIN');
    expect(result.user).not.toHaveProperty('password');
  });

  it('rejects unknown username', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ username: 'x', password: 'y' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(fakeUser);
    await expect(
      service.login({ username: 'admin', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...fakeUser, isActive: false });
    await expect(
      service.login({ username: 'admin', password: 'admin123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
