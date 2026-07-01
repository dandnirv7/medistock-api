import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

/**
 * Query DTO for GET /reports/stock-out.
 *
 * Both `date_from` and `date_to` are required. Cross-field validation
 * (`date_from <= date_to`) is performed in the service layer because
 * class-validator has no built-in cross-field comparator; a violation
 * throws BusinessException({ code: 'INVALID_DATE', … }).
 */
export class StockOutReportQueryDto {
  @ApiProperty({ example: '2025-01-01', description: 'Start date (inclusive)' })
  @IsNotEmpty()
  @IsDateString()
  date_from!: string;

  @ApiProperty({ example: '2025-12-31', description: 'End date (inclusive)' })
  @IsNotEmpty()
  @IsDateString()
  date_to!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by medicine ID' })
  @IsOptional()
  @IsUUID()
  medicine_id?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by supplier ID (via medicine.supplierId)',
  })
  @IsOptional()
  @IsUUID()
  supplier_id?: string;
}
