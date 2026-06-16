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

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { EnvelopeDto } from '../common/dto/envelope.dto';
import { PageDto } from '../common/dto/page.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import type { AuthenticatedUser } from '../common/types/auth-user.type';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { MedicineCreateResultDto } from './dto/medicine-create-result.dto';
import { MedicineItemDto } from './dto/medicine-item.dto';
import { MedicineQueryDto } from './dto/medicine-query.dto';
import { MedicineUpdateResultDto } from './dto/medicine-update-result.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { MedicineItem, MedicinesService } from './medicines.service';

@Controller('medicines')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('medicines')
@ApiBearerAuth('jwt')
export class MedicinesController {
  constructor(private readonly service: MedicinesService) {}

  @Get()
  @ApiOperation({ summary: 'List medicines (paginated, filterable)' })
  @ApiOkResponse({ type: EnvelopeDto<PageDto<MedicineItemDto>> })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  list(@Query() query: MedicineQueryDto): Promise<{
    data: MedicineItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single medicine by id' })
  @ApiOkResponse({ type: EnvelopeDto<MedicineItemDto> })
  @ApiNotFoundResponse({ description: 'Medicine not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  findOne(@Param('id', ParseIdPipe) id: string): Promise<MedicineItem> {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new medicine (ADMIN only)' })
  @ApiCreatedResponse({ type: EnvelopeDto<MedicineCreateResultDto> })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  create(
    @Body() dto: CreateMedicineDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MedicineCreateResultDto> {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a medicine (ADMIN only)' })
  @ApiOkResponse({ type: EnvelopeDto<MedicineUpdateResultDto> })
  @ApiNotFoundResponse({ description: 'Medicine not found' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateMedicineDto,
  ): Promise<MedicineUpdateResultDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete a medicine (ADMIN only)' })
  @ApiOkResponse({
    description: 'Medicine soft-deleted (data: null)',
    type: EnvelopeDto<null>,
  })
  @ApiNotFoundResponse({ description: 'Medicine not found' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async remove(@Param('id', ParseIdPipe) id: string): Promise<null> {
    await this.service.softDelete(id);
    return null;
  }
}
