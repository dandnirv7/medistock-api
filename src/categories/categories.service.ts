import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  medicineCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CategoryQueryDto): Promise<{
    data: CategoryItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(typeof query.isActive === 'boolean'
        ? { isActive: query.isActive }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { medicines: true } } },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: rows.map((c) => this.toItem(c)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string): Promise<CategoryItem> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { medicines: true } } },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.toItem(category);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryItem> {
    try {
      const created = await this.prisma.category.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          isActive: true,
        },
        include: { _count: { select: { medicines: true } } },
      });
      return this.toItem(created);
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryItem> {
    await this.findOne(id);
    try {
      const updated = await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: { _count: { select: { medicines: true } } },
      });
      return this.toItem(updated);
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async softDelete(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private toItem(
    c: Prisma.CategoryGetPayload<{
      include: { _count: { select: { medicines: true } } };
    }>,
  ): CategoryItem {
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      isActive: c.isActive,
      medicineCount: c._count.medicines,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private handleUniqueError(err: unknown): never {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new ConflictException('Category with this name already exists');
    }
    throw err;
  }
}
