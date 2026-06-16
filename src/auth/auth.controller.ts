import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { EnvelopeDto } from '../common/dto/envelope.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../common/types/auth-user.type';
import { AuthService } from './auth.service';
import {
  LoginResultDto,
  LogoutResponseDto,
  MeResponseDto,
  UnauthorizedResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
@ApiTags('auth')
@ApiBearerAuth('jwt')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Stricter limit on login to slow down brute-force password guesses.
  @Public()
  @Throttle({ login: { ttl: 60_000, limit: 5 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with username + password' })
  @ApiOkResponse({
    description: 'Login succeeded, returns JWT + user profile',
    type: EnvelopeDto<LoginResultDto>,
  })
  @ApiUnauthorizedResponse({
    description: 'Bad credentials',
    type: UnauthorizedResponseDto,
  })
  login(@Body() dto: LoginDto): Promise<LoginResultDto> {
    return this.authService.login(dto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user profile' })
  @ApiOkResponse({
    description: 'Profile of the bearer token subject',
    type: EnvelopeDto<MeResponseDto>,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid token',
    type: UnauthorizedResponseDto,
  })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    const profile = await this.authService.me(user.id);
    return {
      id: profile!.id,
      name: profile!.name,
      username: profile!.username,
      email: profile!.email,
      role: profile!.role,
    };
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout (no-op for stateless JWT)' })
  @ApiResponse({
    status: 201,
    description: 'Logout acknowledged',
    type: EnvelopeDto<LogoutResponseDto>,
  })
  logout(): LogoutResponseDto {
    return { message: 'Logout berhasil' };
  }
}
