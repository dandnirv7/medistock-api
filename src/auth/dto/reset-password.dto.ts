import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'newpass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  newPassword!: string;
}
