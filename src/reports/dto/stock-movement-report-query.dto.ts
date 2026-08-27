import { ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementReason, StockMovementType } from '@prisma/client';
import {
  IsDateString,
  IsIn,
  IsISO8601,
  IsOptional,
  IsUUID,
} from 'class-validator';

/**
 * Query for GET /reports/stock-movements.csv. Filters mirror the
 * list endpoint except pagination is dropped (export returns all
 * matches, ordered by transactionDate DESC).
 */
export class StockMovementReportQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  medicineId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({
    enum: StockMovementType,
    enumName: 'StockMovementType',
  })
  @IsOptional()
  @IsIn(Object.values(StockMovementType))
  type?: StockMovementType;

  @ApiPropertyOptional({
    enum: StockMovementReason,
    enumName: 'StockMovementReason',
  })
  @IsOptional()
  @IsIn(Object.values(StockMovementReason))
  reason?: StockMovementReason;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Reference date for the export (default: now)',
  })
  @IsOptional()
  @IsISO8601()
  now?: string;
}
