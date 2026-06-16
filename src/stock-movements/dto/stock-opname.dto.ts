import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class StockOpnameDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  medicineId!: string;

  @ApiProperty({
    example: 75,
    description:
      'Target absolute stock level after physical count. Must be >= 0. ' +
      'The service computes the delta and creates a single ADJUSTMENT ' +
      'movement (IN if newStock > current, OUT if newStock < current).',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newStock!: number;

  @ApiProperty({
    example: 'Hasil opname Mei 2026',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: '2026-05-31',
    required: false,
    description: 'Defaults to now() if not provided.',
  })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}
