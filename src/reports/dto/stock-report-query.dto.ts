import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

/**
 * Query DTO for GET /reports/stock.
 *
 * Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */
export class StockReportQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by supplier ID' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({
    enum: ['low', 'expired', 'healthy'],
    description:
      'Filter by computed stock status. Invalid values → 422 VALIDATION_ERROR.',
  })
  @IsOptional()
  @IsIn(['low', 'expired', 'healthy'])
  status?: 'low' | 'expired' | 'healthy';
}
