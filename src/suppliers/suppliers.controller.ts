import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { EnvelopeDto } from '../common/dto/envelope.dto';
import { PageDto } from '../common/dto/page.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SupplierItemDto } from './dto/supplier-item.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierItem, SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('suppliers')
@ApiBearerAuth('jwt')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'List suppliers (paginated, searchable)' })
  @ApiOkResponse({ type: EnvelopeDto<PageDto<SupplierItemDto>> })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  list(@Query() query: SupplierQueryDto): Promise<{
    data: SupplierItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single supplier by id' })
  @ApiOkResponse({ type: EnvelopeDto<SupplierItemDto> })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  findOne(@Param('id', ParseIdPipe) id: string): Promise<SupplierItem> {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new supplier (ADMIN only)' })
  @ApiCreatedResponse({ type: EnvelopeDto<SupplierItemDto> })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  create(@Body() dto: CreateSupplierDto): Promise<SupplierItem> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a supplier (ADMIN only)' })
  @ApiOkResponse({ type: EnvelopeDto<SupplierItemDto> })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierItem> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete a supplier (ADMIN only)' })
  @ApiOkResponse({
    description: 'Supplier soft-deleted (data: null)',
    type: EnvelopeDto<null>,
  })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async remove(@Param('id', ParseIdPipe) id: string): Promise<null> {
    await this.service.softDelete(id);
    return null;
  }
}
