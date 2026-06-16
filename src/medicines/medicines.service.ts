import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementReason, StockMovementType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { MedicineQueryDto } from './dto/medicine-query.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { computeExpiredStatus, computeStockStatus } from './medicines.helpers';

export interface MedicineItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: number;
  minimumStock: number;
  expiredDate: string | null;
  description: string | null;
  isActive: boolean;
  stockStatus: 'LOW_STOCK' | 'SAFE';
  expiredStatus: 'EXPIRED' | 'EXPIRED_SOON' | 'SAFE' | 'UNKNOWN';
  category: { id: string; name: string };
  supplier: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MedicinesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: MedicineQueryDto): Promise<{
    data: MedicineItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const reference = query.now ? new Date(query.now) : new Date();
    const soonBoundary = new Date(reference);
    soonBoundary.setUTCDate(soonBoundary.getUTCDate() + 30);
    const today = new Date(
      Date.UTC(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        reference.getUTCDate(),
      ),
    );

    const where: Prisma.MedicineWhereInput = {
      isActive: true,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { category: { name: { contains: query.search, mode: 'insensitive' } } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.expiredStatus) {
      if (query.expiredStatus === 'expired') {
        where.expiredDate = { lt: today };
      } else if (query.expiredStatus === 'soon') {
        where.expiredDate = { gte: today, lte: soonBoundary };
      } else if (query.expiredStatus === 'safe') {
        where.expiredDate = { gt: soonBoundary };
      }
    }

    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

    // If a lowStock filter is requested we can't push it to the DB (Prisma
    // cannot compare two columns portably), so we fetch all matching rows and
    // paginate in memory after the filter.
    if (typeof query.lowStock === 'boolean') {
      const all = await this.prisma.medicine.findMany({
        where,
        orderBy,
        include: { category: true, supplier: true },
      });
      const items = all.map((m) => this.toItem(m, reference));
      const filtered = items.filter((m) =>
        query.lowStock
          ? m.stockStatus === 'LOW_STOCK'
          : m.stockStatus === 'SAFE',
      );
      const total = filtered.length;
      const data = filtered.slice(skip, skip + limit);
      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.medicine.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { category: true, supplier: true },
      }),
      this.prisma.medicine.count({ where }),
    ]);

    const data = rows.map((m) => this.toItem(m, reference));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string): Promise<MedicineItem> {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
      include: { category: true, supplier: true },
    });
    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }
    return this.toItem(medicine, new Date());
  }

  async create(
    dto: CreateMedicineDto,
    userId: string,
  ): Promise<{ id: string; code: string; name: string; currentStock: number }> {
    await this.assertRefsExist(dto.categoryId, dto.supplierId ?? undefined);

    const initialStock = dto.currentStock ?? 0;
    const farFuture = new Date('2099-12-31T00:00:00.000Z');
    const expiredDate = dto.expiredDate ? new Date(dto.expiredDate) : farFuture;

    const createData: Prisma.MedicineUncheckedCreateInput = {
      code: dto.code,
      name: dto.name,
      categoryId: dto.categoryId,
      supplierId: dto.supplierId,
      unit: dto.unit,
      purchasePrice: new Prisma.Decimal(dto.purchasePrice),
      sellingPrice: new Prisma.Decimal(dto.sellingPrice),
      currentStock: initialStock,
      minimumStock: dto.minimumStock,
      expiredDate,
      description: dto.description ?? null,
      isActive: true,
    };

    const created = await this.prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.create({ data: createData });

      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            medicineId: medicine.id,
            userId,
            supplierId: dto.supplierId,
            type: StockMovementType.IN,
            reason: StockMovementReason.ADJUSTMENT,
            quantity: initialStock,
            stockBefore: 0,
            stockAfter: initialStock,
            transactionDate: new Date(),
            notes: 'Initial stock',
          },
        });
      }

      return medicine;
    });

    return {
      id: created.id,
      code: created.code,
      name: created.name,
      currentStock: created.currentStock,
    };
  }

  async update(
    id: string,
    dto: UpdateMedicineDto,
  ): Promise<{ id: string; code: string; name: string }> {
    const existing = await this.prisma.medicine.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Medicine not found');
    }

    if (dto.categoryId) {
      await this.assertRefsExist(
        dto.categoryId,
        dto.supplierId ?? existing.supplierId,
      );
    } else if (dto.supplierId) {
      await this.assertRefsExist(existing.categoryId, dto.supplierId);
    }

    if (dto.categoryId && existing.categoryId !== dto.categoryId) {
      const cat = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!cat) {
        throw new BadRequestException('Category not found');
      }
    }

    const data: Prisma.MedicineUncheckedUpdateInput = {
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
      ...(dto.purchasePrice !== undefined
        ? { purchasePrice: new Prisma.Decimal(dto.purchasePrice) }
        : {}),
      ...(dto.sellingPrice !== undefined
        ? { sellingPrice: new Prisma.Decimal(dto.sellingPrice) }
        : {}),
      ...(dto.minimumStock !== undefined
        ? { minimumStock: dto.minimumStock }
        : {}),
      ...(dto.expiredDate ? { expiredDate: new Date(dto.expiredDate) } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };

    try {
      const updated = await this.prisma.medicine.update({
        where: { id },
        data,
      });
      return { id: updated.id, code: updated.code, name: updated.name };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Medicine with this code already exists');
      }
      throw err;
    }
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.prisma.medicine.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Medicine not found');
    }
    await this.prisma.medicine.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async assertRefsExist(
    categoryId?: string,
    supplierId?: string | null,
  ): Promise<void> {
    if (categoryId) {
      const cat = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!cat) {
        throw new BadRequestException('Category not found');
      }
    }
    if (supplierId) {
      const sup = await this.prisma.supplier.findUnique({
        where: { id: supplierId },
      });
      if (!sup) {
        throw new BadRequestException('Supplier not found');
      }
    }
  }

  private buildOrderBy(
    sortBy: MedicineQueryDto['sortBy'],
    sortOrder: MedicineQueryDto['sortOrder'],
  ): Prisma.MedicineOrderByWithRelationInput {
    const order = sortOrder ?? 'desc';
    switch (sortBy) {
      case 'name':
        return { name: order };
      case 'code':
        return { code: order };
      case 'currentStock':
        return { currentStock: order };
      case 'expiredDate':
        return { expiredDate: order };
      case 'createdAt':
      default:
        return { createdAt: order };
    }
  }

  private toItem(
    m: Prisma.MedicineGetPayload<{
      include: { category: true; supplier: true };
    }>,
    reference: Date,
  ): MedicineItem {
    return {
      id: m.id,
      code: m.code,
      name: m.name,
      unit: m.unit,
      purchasePrice: m.purchasePrice.toFixed(2),
      sellingPrice: m.sellingPrice.toFixed(2),
      currentStock: m.currentStock,
      minimumStock: m.minimumStock,
      expiredDate: m.expiredDate
        ? m.expiredDate.toISOString().slice(0, 10)
        : null,
      description: m.description,
      isActive: m.isActive,
      stockStatus: computeStockStatus(m.currentStock, m.minimumStock),
      expiredStatus: computeExpiredStatus(m.expiredDate, reference),
      category: { id: m.category.id, name: m.category.name },
      supplier: m.supplier
        ? { id: m.supplier.id, name: m.supplier.name }
        : null,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
