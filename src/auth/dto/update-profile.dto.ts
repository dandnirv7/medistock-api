import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Staff Apotek', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'staff@medistock.local', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string | null;
}
