import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../common/types/auth-user.type';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

interface MeResponse {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: 'ADMIN' | 'STAFF';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    const profile = await this.authService.me(user.id);
    return {
      id: profile!.id,
      name: profile!.name,
      username: profile!.username,
      email: profile!.email,
      role: profile!.role,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(): { message: string } {
    return { message: 'Logout berhasil' };
  }
}
