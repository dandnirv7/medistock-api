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
import { CategoriesService, CategoryItem } from './categories.service';
import { CategoryItemDto } from './dto/category-item.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('categories')
@ApiBearerAuth('jwt')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories (paginated, searchable)' })
  @ApiOkResponse({ type: EnvelopeDto<PageDto<CategoryItemDto>> })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  list(@Query() query: CategoryQueryDto): Promise<{
    data: CategoryItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single category by id' })
  @ApiOkResponse({ type: EnvelopeDto<CategoryItemDto> })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  findOne(@Param('id', ParseIdPipe) id: string): Promise<CategoryItem> {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new category (ADMIN only)' })
  @ApiCreatedResponse({ type: EnvelopeDto<CategoryItemDto> })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryItem> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a category (ADMIN only)' })
  @ApiOkResponse({ type: EnvelopeDto<CategoryItemDto> })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  update(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryItem> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete a category (ADMIN only)' })
  @ApiOkResponse({
    description: 'Category soft-deleted (data: null)',
    type: EnvelopeDto<null>,
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async remove(@Param('id', ParseIdPipe) id: string): Promise<null> {
    await this.service.softDelete(id);
    return null;
  }
}
