import { ApiProperty } from '@nestjs/swagger';

export class StockMovementMedicineRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PAR-500' })
  code!: string;

  @ApiProperty({ example: 'Paracetamol 500 mg' })
  name!: string;

  @ApiProperty({ example: 'Tablet' })
  unit!: string;
}

export class StockMovementSupplierRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PT Kimia Farma' })
  name!: string;
}

export class StockMovementItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['IN', 'OUT'] })
  type!: 'IN' | 'OUT';

  @ApiProperty({
    enum: [
      'PURCHASE',
      'RETURN_TO_SUPPLIER',
      'SALE',
      'EXPIRED',
      'DAMAGED',
      'STOCK_OPNAME',
    ],
  })
  reason!:
    | 'PURCHASE'
    | 'RETURN_TO_SUPPLIER'
    | 'SALE'
    | 'EXPIRED'
    | 'DAMAGED'
    | 'STOCK_OPNAME';

  @ApiProperty({ example: 50 })
  quantity!: number;

  @ApiProperty({ example: 70 })
  stockBefore!: number;

  @ApiProperty({ example: 120 })
  stockAfter!: number;

  @ApiProperty({ example: '2026-06-15T10:00:00.000Z' })
  transactionDate!: string;

  @ApiProperty({ nullable: true, example: 'Restock dari PO #123' })
  notes!: string | null;

  @ApiProperty({ type: StockMovementMedicineRefDto })
  medicine!: StockMovementMedicineRefDto;

  @ApiProperty({ type: StockMovementSupplierRefDto, nullable: true })
  supplier!: StockMovementSupplierRefDto | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
