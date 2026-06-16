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

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierItem, SuppliersService } from './suppliers.service';

interface PaginatedEnvelope {
  data: SupplierItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  list(@Query() query: SupplierQueryDto): Promise<PaginatedEnvelope> {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: string): Promise<SupplierItem> {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateSupplierDto): Promise<SupplierItem> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierItem> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  async remove(@Param('id', ParseIdPipe) id: string): Promise<null> {
    await this.service.softDelete(id);
    return null;
  }
}
