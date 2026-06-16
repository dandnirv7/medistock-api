import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'admin123', description: 'Plain text password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
