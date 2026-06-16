import { ApiProperty } from '@nestjs/swagger';

export class MedicineCreateResultDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PAR-500' })
  code!: string;

  @ApiProperty({ example: 'Paracetamol 500 mg' })
  name!: string;

  @ApiProperty({ example: 0 })
  currentStock!: number;
}
