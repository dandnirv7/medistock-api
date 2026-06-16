import { ApiProperty } from '@nestjs/swagger';

export class MedicineCategoryRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Analgesik' })
  name!: string;
}

export class MedicineSupplierRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PT Kimia Farma' })
  name!: string;
}

export class MedicineItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PAR-500' })
  code!: string;

  @ApiProperty({ example: 'Paracetamol 500 mg' })
  name!: string;

  @ApiProperty({ example: 'Tablet' })
  unit!: string;

  @ApiProperty({ example: '250.00', description: 'Decimal returned as string' })
  purchasePrice!: string;

  @ApiProperty({ example: '500.00' })
  sellingPrice!: string;

  @ApiProperty({ example: 120 })
  currentStock!: number;

  @ApiProperty({ example: 10 })
  minimumStock!: number;

  @ApiProperty({ nullable: true, example: '2027-12-31' })
  expiredDate!: string | null;

  @ApiProperty({ nullable: true, example: 'Obat pereda nyeri dan demam' })
  description!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ enum: ['LOW_STOCK', 'SAFE'] })
  stockStatus!: 'LOW_STOCK' | 'SAFE';

  @ApiProperty({ enum: ['EXPIRED', 'EXPIRED_SOON', 'SAFE', 'UNKNOWN'] })
  expiredStatus!: 'EXPIRED' | 'EXPIRED_SOON' | 'SAFE' | 'UNKNOWN';

  @ApiProperty({ type: MedicineCategoryRefDto })
  category!: MedicineCategoryRefDto;

  @ApiProperty({ type: MedicineSupplierRefDto, nullable: true })
  supplier!: MedicineSupplierRefDto | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
