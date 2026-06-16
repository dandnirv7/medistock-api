import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../common/types/auth-user.type';
import { StockInDto } from './dto/stock-in.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';
import { StockOutDto } from './dto/stock-out.dto';
import {
  StockMovementItem,
  StockMovementsService,
} from './stock-movements.service';

interface PaginatedEnvelope {
  data: StockMovementItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Controller('stock-movements')
@UseGuards(JwtAuthGuard)
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  @Get()
  list(@Query() query: StockMovementQueryDto): Promise<PaginatedEnvelope> {
    return this.service.list(query);
  }

  @Post('in')
  @HttpCode(201)
  stockIn(
    @Body() dto: StockInDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<StockMovementsService['stockIn']> {
    return this.service.stockIn(dto, user.id);
  }

  @Post('out')
  @HttpCode(201)
  stockOut(
    @Body() dto: StockOutDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<StockMovementsService['stockOut']> {
    return this.service.stockOut(dto, user.id);
  }
}
