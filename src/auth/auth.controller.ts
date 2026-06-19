import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  BadRequestResponseDto,
  ConflictResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
} from '../common/dto/error-responses.dto';
import { EnvelopeDto } from '../common/dto/envelope.dto';
import { PageDto } from '../common/dto/page.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import type { AuthenticatedUser } from '../common/types/auth-user.type';
import { AuthService } from './auth.service';
import {
  LoginResultDto,
  LogoutResponseDto,
  MeResponseDto,
  UnauthorizedResponseDto,
} from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserItemDto } from './dto/user-item.dto';
import { UserQueryDto } from './dto/user-query.dto';

// Stricter per-minute cap for the login route, overridable via
// THROTTLE_LOGIN_LIMIT (defaults to 5/min) to slow brute-force guessing.
// This overrides the global 'default' throttler bucket on this handler
// only — it does NOT register a second global throttler (which would
// otherwise throttle every endpoint at this limit).
// Under NODE_ENV=test the cap is lifted (mirrors the global test config)
// so e2e suites can hammer /auth/login without tripping 429s.
function resolveLoginLimit(): number {
  if (process.env.NODE_ENV === 'test') {
    const testRaw = Number(process.env.THROTTLE_TEST_LIMIT);
    return Number.isFinite(testRaw) && testRaw > 0
      ? Math.floor(testRaw)
      : 1_000_000;
  }
  const raw = Number(process.env.THROTTLE_LOGIN_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 5;
}
const LOGIN_LIMIT = resolveLoginLimit();

@Controller('auth')
@ApiTags('auth')
@ApiBearerAuth('jwt')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Stricter limit on login to slow down brute-force password guesses.
  // Overrides the global 'default' bucket for this route only.
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: LOGIN_LIMIT } })
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
  @ApiOperation({ summary: 'Current authenticated user (JWT-projected)' })
  @ApiOkResponse({ type: EnvelopeDto<MeResponseDto> })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid token',
    type: UnauthorizedResponseDto,
  })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    const profile = await this.authService.me(user.id);
    return profile as MeResponseDto;
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (name, email)' })
  @ApiOkResponse({ type: EnvelopeDto<MeResponseDto> })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<MeResponseDto> {
    return this.authService.updateProfile(user.id, dto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('me/change-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change own password' })
  @ApiOkResponse({
    description: 'Password changed (data: null)',
    type: EnvelopeDto<null>,
  })
  @ApiUnauthorizedResponse({
    description: 'Old password incorrect',
    type: UnauthorizedResponseDto,
  })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<null> {
    return this.authService.changePassword(user.id, dto);
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

  // ---------------------------------------------------------------------------
  // Admin: user management
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('users')
  @ApiOperation({ summary: 'List users (paginated, filterable)' })
  @ApiOkResponse({ type: EnvelopeDto<PageDto<UserItemDto>> })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiForbiddenResponse({
    description: 'Caller is not an ADMIN',
    type: ForbiddenResponseDto,
  })
  listUsers(
    @Query() query: UserQueryDto,
  ): ReturnType<AuthService['listUsers']> {
    return this.authService.listUsers(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('users/:id')
  @ApiOperation({ summary: 'Get a single user by id' })
  @ApiOkResponse({ type: EnvelopeDto<UserItemDto> })
  @ApiNotFoundResponse({
    description: 'User not found',
    type: NotFoundResponseDto,
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiForbiddenResponse({ type: ForbiddenResponseDto })
  findUser(
    @Param('id', ParseIdPipe) id: string,
  ): ReturnType<AuthService['findUser']> {
    return this.authService.findUser(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('users')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new user (ADMIN only)' })
  @ApiCreatedResponse({ type: EnvelopeDto<UserItemDto> })
  @ApiConflictResponse({
    description: 'Username already exists',
    type: ConflictResponseDto,
  })
  @ApiBadRequestResponse({ type: BadRequestResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiForbiddenResponse({ type: ForbiddenResponseDto })
  createUser(
    @Body() dto: CreateUserDto,
  ): ReturnType<AuthService['createUser']> {
    return this.authService.createUser(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('users/:id')
  @ApiOperation({ summary: 'Update a user (ADMIN only)' })
  @ApiOkResponse({ type: EnvelopeDto<UserItemDto> })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  @ApiConflictResponse({ type: ConflictResponseDto })
  @ApiBadRequestResponse({ type: BadRequestResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiForbiddenResponse({ type: ForbiddenResponseDto })
  updateUser(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): ReturnType<AuthService['updateUser']> {
    return this.authService.updateUser(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('users/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete a user (deactivate, ADMIN only)' })
  @ApiOkResponse({
    description: 'User deactivated (data: null)',
    type: EnvelopeDto<null>,
  })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  @ApiBadRequestResponse({
    description: 'Admin cannot deactivate themselves',
    type: BadRequestResponseDto,
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiForbiddenResponse({ type: ForbiddenResponseDto })
  deleteUser(
    @Param('id', ParseIdPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<null> {
    return this.authService.deleteUser(id, actor.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('users/:id/reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Reset a user password (ADMIN only). Returns the new password.',
  })
  @ApiOkResponse({
    description:
      'Password reset; newPassword is returned for the admin to share',
    schema: {
      example: {
        success: true,
        message: 'Success',
        data: { newPassword: 'newpass123' },
      },
    },
  })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiForbiddenResponse({ type: ForbiddenResponseDto })
  resetPassword(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ): ReturnType<AuthService['resetPassword']> {
    return this.authService.resetPassword(id, dto);
  }
}
