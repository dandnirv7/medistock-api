import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { ForbiddenResponseDto } from '../common/dto/error-responses.dto';
import { UnauthorizedResponseDto } from '../common/dto/error-responses.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StockMovementReportQueryDto } from './dto/stock-movement-report-query.dto';
import { ReportsService } from './reports.service';

/**
 * The CSV endpoints write directly to the Express response and skip
 * the global ResponseInterceptor (which would JSON-envelope the body).
 * Headers are set on `res` so the browser / Flutter client gets a
 * proper file download with the correct charset. UTF-8 BOM is added
 * server-side so Excel in Indonesian locale decodes the columns
 * correctly.
 */
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiTags('reports')
@ApiBearerAuth('jwt')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('stock-movements.csv')
  @ApiOperation({
    summary: 'Export stock movements to CSV (ADMIN only).',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV with one row per matching stock movement',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiForbiddenResponse({ type: ForbiddenResponseDto })
  async stockMovements(
    @Query() query: StockMovementReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.service.stockMovementsCsv(query);
    this.sendCsv(res, csv, 'stock-movements.csv');
  }

  @Get('low-stock.csv')
  @ApiOperation({
    summary:
      'Export medicines with currentStock <= minimumStock to CSV (ADMIN only).',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV with one row per low-stock medicine',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiForbiddenResponse({ type: ForbiddenResponseDto })
  async lowStock(@Res() res: Response): Promise<void> {
    const csv = await this.service.lowStockCsv();
    this.sendCsv(res, csv, 'low-stock.csv');
  }

  @Get('expired-soon.csv')
  @ApiOperation({
    summary: 'Export medicines expiring within 30 days to CSV (ADMIN only).',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV with one row per expired-soon medicine',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedResponseDto })
  @ApiForbiddenResponse({ type: ForbiddenResponseDto })
  async expiredSoon(
    @Query('now') now: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.service.expiredSoonCsv(
      now ? new Date(now) : new Date(),
    );
    this.sendCsv(res, csv, 'expired-soon.csv');
  }

  private sendCsv(res: Response, body: string, filename: string): void {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(body);
  }
}
