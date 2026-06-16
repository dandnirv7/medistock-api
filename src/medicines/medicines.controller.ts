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

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import type { AuthenticatedUser } from '../common/types/auth-user.type';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { MedicineQueryDto } from './dto/medicine-query.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { MedicineItem, MedicinesService } from './medicines.service';

interface PaginatedEnvelope {
  data: MedicineItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Controller('medicines')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicinesController {
  constructor(private readonly service: MedicinesService) {}

  @Get()
  list(@Query() query: MedicineQueryDto): Promise<PaginatedEnvelope> {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: string): Promise<MedicineItem> {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body() dto: CreateMedicineDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; code: string; name: string; currentStock: number }> {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateMedicineDto,
  ): Promise<{ id: string; code: string; name: string }> {
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
