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
import { CategoriesService, CategoryItem } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

interface PaginatedEnvelope {
  data: CategoryItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  list(@Query() query: CategoryQueryDto): Promise<PaginatedEnvelope> {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: string): Promise<CategoryItem> {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateCategoryDto): Promise<CategoryItem> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryItem> {
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
