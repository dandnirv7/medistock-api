import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class StockOpnameBulkItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  medicineId!: string;

  @ApiProperty({
    example: 25,
    description:
      'Target absolute stock level after physical count. Must be >= 0. ' +
      'If newStock === currentStock, the item is reported as a no-op ' +
      'failure and the medicine is left untouched.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newStock!: number;

  @ApiProperty({ example: 'Hilang 3 box', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class StockOpnameBulkDto {
  @ApiProperty({
    type: StockOpnameBulkItemDto,
    isArray: true,
    description: '1–500 items per request. Larger batches should be split.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => StockOpnameBulkItemDto)
  items!: StockOpnameBulkItemDto[];

  @ApiProperty({
    example: '2026-05-31',
    required: false,
    description: 'Applied to every movement in the batch. Defaults to now().',
  })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}
