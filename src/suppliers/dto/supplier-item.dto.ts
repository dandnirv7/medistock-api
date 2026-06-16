import { ApiProperty } from '@nestjs/swagger';

export class SupplierItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PT Kimia Farma' })
  name!: string;

  @ApiProperty({ nullable: true, example: '021-5551234' })
  phone!: string | null;

  @ApiProperty({ nullable: true, example: 'sales@kimiafarma.co.id' })
  email!: string | null;

  @ApiProperty({ nullable: true, example: 'Jl. Veteran No. 1, Jakarta' })
  address!: string | null;

  @ApiProperty({ nullable: true, example: 'Distributor resmi' })
  notes!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 34 })
  medicineCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
