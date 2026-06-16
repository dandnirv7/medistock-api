import { ApiProperty } from '@nestjs/swagger';

export class CategoryItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Analgesik' })
  name!: string;

  @ApiProperty({ nullable: true, example: 'Obat pereda nyeri' })
  description!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 12 })
  medicineCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
