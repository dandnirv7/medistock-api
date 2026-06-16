import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMedicineDto {
  @ApiProperty({ example: 'PAR-500' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Paracetamol 500 mg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  supplierId!: string;

  @ApiProperty({ example: 'Tablet' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @ApiProperty({ example: 250, description: 'In IDR, no decimals' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchasePrice!: number;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentStock?: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumStock!: number;

  @ApiProperty({ example: '2027-12-31', required: false })
  @IsOptional()
  @IsDateString()
  expiredDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
