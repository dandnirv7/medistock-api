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
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsUUID()
  categoryId!: string;

  @IsUUID()
  supplierId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchasePrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentStock?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumStock!: number;

  @IsOptional()
  @IsDateString()
  expiredDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
