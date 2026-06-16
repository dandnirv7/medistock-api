import { ApiProperty } from '@nestjs/swagger';

export class LowStockMedicineDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PAR-500' })
  code!: string;

  @ApiProperty({ example: 'Paracetamol 500 mg' })
  name!: string;

  @ApiProperty({ example: 'Tablet' })
  unit!: string;

  @ApiProperty({ example: 3 })
  currentStock!: number;

  @ApiProperty({ example: 10 })
  minimumStock!: number;
}

export class ExpiredSoonMedicineDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PAR-500' })
  code!: string;

  @ApiProperty({ example: 'Paracetamol 500 mg' })
  name!: string;

  @ApiProperty({ example: 'Tablet' })
  unit!: string;

  @ApiProperty({ example: '2026-07-30' })
  expiredDate!: string;

  @ApiProperty({ example: 45 })
  currentStock!: number;
}

export class DashboardSummaryDto {
  @ApiProperty({ example: 87 })
  totalMedicines!: number;

  @ApiProperty({ example: 4250 })
  totalStock!: number;

  @ApiProperty({ example: 12 })
  totalCategories!: number;

  @ApiProperty({ example: 9 })
  totalSuppliers!: number;

  @ApiProperty({ example: 4 })
  lowStockCount!: number;

  @ApiProperty({ example: 6 })
  expiredSoonCount!: number;

  @ApiProperty({ example: 1 })
  expiredCount!: number;

  @ApiProperty({ type: [LowStockMedicineDto] })
  lowStockMedicines!: LowStockMedicineDto[];

  @ApiProperty({ type: [ExpiredSoonMedicineDto] })
  expiredSoonMedicines!: ExpiredSoonMedicineDto[];
}
