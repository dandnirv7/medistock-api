import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { StockMovementReason } from '@prisma/client';

export class StockOutDto {
  @IsUUID()
  @IsNotEmpty()
  medicineId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsIn(Object.values(StockMovementReason) as string[])
  reason!: StockMovementReason;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
