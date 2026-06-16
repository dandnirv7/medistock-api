import { ApiProperty } from '@nestjs/swagger';

export class BulkOpnameItemResult {
  @ApiProperty({ format: 'uuid' })
  medicineId!: string;

  @ApiProperty({ enum: ['ok', 'error'] })
  status!: 'ok' | 'error';

  @ApiProperty({ required: false, example: 10 })
  stockBefore?: number;

  @ApiProperty({ required: false, example: 25 })
  stockAfter?: number;

  @ApiProperty({ required: false, enum: ['IN', 'OUT'] })
  type?: 'IN' | 'OUT';

  @ApiProperty({ required: false, example: 15 })
  quantity?: number;

  @ApiProperty({ required: false, format: 'uuid' })
  movementId?: string;

  @ApiProperty({
    required: false,
    enum: ['not_found', 'no_change'],
  })
  error?: 'not_found' | 'no_change';

  @ApiProperty({
    required: false,
    example: 'Stok fisik sama dengan stok sistem, tidak ada perubahan',
  })
  message?: string;
}

export class BulkOpnameSummary {
  @ApiProperty({ example: 4 })
  total!: number;

  @ApiProperty({ example: 2 })
  succeeded!: number;

  @ApiProperty({ example: 2 })
  failed!: number;
}

export class StockOpnameBulkResultDto {
  @ApiProperty({ type: BulkOpnameItemResult, isArray: true })
  data!: BulkOpnameItemResult[];

  @ApiProperty({ type: BulkOpnameSummary })
  summary!: BulkOpnameSummary;
}
