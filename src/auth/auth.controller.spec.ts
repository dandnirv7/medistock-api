import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { login: jest.Mock; me: jest.Mock };

  beforeEach(async () => {
    authService = { login: jest.fn(), me: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    controller = module.get(AuthController);
  });

  it('POST /auth/login delegates to AuthService.login', async () => {
    authService.login.mockResolvedValue({
      accessToken: 't',
      user: { id: '1' },
    });
    const dto: LoginDto = { username: 'a', password: 'b' };
    const res = await controller.login(dto);
    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(res.accessToken).toBe('t');
  });

  it('GET /auth/me returns profile from AuthService.me', async () => {
    authService.me.mockResolvedValue({
      id: 'u1',
      name: 'Admin',
      username: 'admin',
      email: 'a@b',
      role: 'ADMIN',
    });
    const res = await controller.getMe({ id: 'u1' } as never);
    expect(res.username).toBe('admin');
  });

  it('POST /auth/logout returns success message', () => {
    expect(controller.logout()).toEqual({ message: 'Logout berhasil' });
  });
});
