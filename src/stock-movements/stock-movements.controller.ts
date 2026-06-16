import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EnvelopeDto } from '../common/dto/envelope.dto';
import { PageDto } from '../common/dto/page.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../common/types/auth-user.type';
import { StockInDto } from './dto/stock-in.dto';
import { StockMovementItemDto } from './dto/stock-movement-item.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';
import { StockOutDto } from './dto/stock-out.dto';
import {
  StockMovementItem,
  StockMovementsService,
} from './stock-movements.service';

@Controller('stock-movements')
@UseGuards(JwtAuthGuard)
@ApiTags('stock-movements')
@ApiBearerAuth('jwt')
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  @Get()
  @ApiOperation({ summary: 'List stock movements (paginated, filterable)' })
  @ApiOkResponse({ type: EnvelopeDto<PageDto<StockMovementItemDto>> })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  list(@Query() query: StockMovementQueryDto): Promise<{
    data: StockMovementItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.service.list(query);
  }

  @Post('in')
  @HttpCode(201)
  @ApiOperation({ summary: 'Record stock IN (purchase, return, opname)' })
  @ApiCreatedResponse({ type: EnvelopeDto<StockMovementItemDto> })
  @ApiNotFoundResponse({ description: 'Medicine or supplier not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  stockIn(
    @Body() dto: StockInDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<StockMovementsService['stockIn']> {
    return this.service.stockIn(dto, user.id);
  }

  @Post('out')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Record stock OUT (sale, expired, damage, opname)',
  })
  @ApiCreatedResponse({ type: EnvelopeDto<StockMovementItemDto> })
  @ApiNotFoundResponse({ description: 'Medicine not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  stockOut(
    @Body() dto: StockOutDto,
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<StockMovementsService['stockOut']> {
    return this.service.stockOut(dto, user.id);
  }
}
