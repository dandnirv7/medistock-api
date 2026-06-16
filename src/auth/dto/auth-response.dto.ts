import { ApiProperty } from '@nestjs/swagger';

import { UserItemDto } from './user-item.dto';

export class LoginUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Admin Apotek' })
  name!: string;

  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiProperty({ nullable: true, example: 'admin@medistock.local' })
  email!: string | null;

  @ApiProperty({ enum: ['ADMIN', 'STAFF'] })
  role!: 'ADMIN' | 'STAFF';
}

export class LoginResultDto {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  accessToken!: string;

  @ApiProperty({ type: LoginUserDto })
  user!: LoginUserDto;
}

export class MeResponseDto extends UserItemDto {}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Logout berhasil' })
  message!: string;
}

export class UnauthorizedResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 'Username atau password salah' })
  message!: string;
}
