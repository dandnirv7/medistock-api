import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception';
import { Prisma, StockMovementReason, StockMovementType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { StockInDto } from './dto/stock-in.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';
import { StockOutDto } from './dto/stock-out.dto';

export interface StockMovementItem {
  id: string;
  type: StockMovementType;
  reason: StockMovementReason;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  transactionDate: string;
  notes: string | null;
  medicine: {
    id: string;
    code: string;
    name: string;
    unit: string;
  };
  supplier: { id: string; name: string } | null;
  user: { id: string; name: string };
  createdAt: Date;
}

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: StockMovementQueryDto): Promise<{
    data: StockMovementItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {
      ...(query.medicineId ? { medicineId: query.medicineId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.reason ? { reason: query.reason } : {}),
      ...(query.startDate || query.endDate
        ? {
            transactionDate: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                medicine: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                medicine: {
                  code: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                supplier: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
              { notes: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          medicine: {
            select: { id: true, code: true, name: true, unit: true },
          },
          supplier: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: rows.map((r) => this.toItem(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async stockIn(
    dto: StockInDto,
    userId: string,
  ): Promise<{
    id: string;
    medicineId: string;
    type: 'IN';
    reason: 'PURCHASE';
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    transactionDate: string;
  }> {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
    });
    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }
    if (dto.supplierId) {
      const sup = await this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
      });
      if (!sup) {
        throw new BadRequestException('Supplier not found');
      }
    }

    const stockBefore = medicine.currentStock;
    const stockAfter = stockBefore + dto.quantity;
    const transactionDate = dto.transactionDate
      ? new Date(dto.transactionDate)
      : new Date();

    const movement = await this.prisma.$transaction(async (tx) => {
      await tx.medicine.update({
        where: { id: medicine.id },
        data: { currentStock: stockAfter },
      });
      const created = await tx.stockMovement.create({
        data: {
          medicineId: medicine.id,
          userId,
          supplierId: dto.supplierId ?? null,
          type: StockMovementType.IN,
          reason: StockMovementReason.PURCHASE,
          quantity: dto.quantity,
          stockBefore,
          stockAfter,
          transactionDate,
          notes: dto.notes ?? null,
        },
      });
      return created;
    });

    return {
      id: movement.id,
      medicineId: movement.medicineId,
      type: 'IN',
      reason: 'PURCHASE',
      quantity: movement.quantity,
      stockBefore: movement.stockBefore,
      stockAfter: movement.stockAfter,
      transactionDate: movement.transactionDate.toISOString().slice(0, 10),
    };
  }

  async stockOut(
    dto: StockOutDto,
    userId: string,
  ): Promise<{
    id: string;
    medicineId: string;
    type: 'OUT';
    reason: StockMovementReason;
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    transactionDate: string;
  }> {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: dto.medicineId },
    });
    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }
    if (dto.quantity > medicine.currentStock) {
      throw new BusinessException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Stok tidak mencukupi',
        details: {
          availableStock: medicine.currentStock,
          requestedQuantity: dto.quantity,
        },
      });
    }

    const stockBefore = medicine.currentStock;
    const stockAfter = stockBefore - dto.quantity;
    const transactionDate = dto.transactionDate
      ? new Date(dto.transactionDate)
      : new Date();

    const movement = await this.prisma.$transaction(async (tx) => {
      await tx.medicine.update({
        where: { id: medicine.id },
        data: { currentStock: stockAfter },
      });
      const created = await tx.stockMovement.create({
        data: {
          medicineId: medicine.id,
          userId,
          type: StockMovementType.OUT,
          reason: dto.reason,
          quantity: dto.quantity,
          stockBefore,
          stockAfter,
          transactionDate,
          notes: dto.notes ?? null,
        },
      });
      return created;
    });

    return {
      id: movement.id,
      medicineId: movement.medicineId,
      type: 'OUT',
      reason: movement.reason,
      quantity: movement.quantity,
      stockBefore: movement.stockBefore,
      stockAfter: movement.stockAfter,
      transactionDate: movement.transactionDate.toISOString().slice(0, 10),
    };
  }

  private toItem(
    m: Prisma.StockMovementGetPayload<{
      include: {
        medicine: { select: { id: true; code: true; name: true; unit: true } };
        supplier: { select: { id: true; name: true } };
        user: { select: { id: true; name: true } };
      };
    }>,
  ): StockMovementItem {
    return {
      id: m.id,
      type: m.type,
      reason: m.reason,
      quantity: m.quantity,
      stockBefore: m.stockBefore,
      stockAfter: m.stockAfter,
      transactionDate: m.transactionDate.toISOString().slice(0, 10),
      notes: m.notes,
      medicine: {
        id: m.medicine.id,
        code: m.medicine.code,
        name: m.medicine.name,
        unit: m.medicine.unit,
      },
      supplier: m.supplier
        ? { id: m.supplier.id, name: m.supplier.name }
        : null,
      user: { id: m.user.id, name: m.user.name },
      createdAt: m.createdAt,
    };
  }
}
