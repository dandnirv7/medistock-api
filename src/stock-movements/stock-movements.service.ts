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
import { StockOpnameBulkDto } from './dto/stock-opname-bulk.dto';
import {
  BulkOpnameItemResult,
  StockOpnameBulkResultDto,
} from './dto/stock-opname-bulk-result.dto';
import { StockOpnameDto } from './dto/stock-opname.dto';
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

  /**
   * Stock opname / adjustment. The client sends the absolute target stock
   * (the result of a physical count) and the service computes the delta
   * and writes a single ADJUSTMENT movement (IN if newStock > current,
   * OUT if newStock < current). No-op (newStock === currentStock) is
   * rejected with 400 so the audit trail does not fill with zero-quantity
   * rows. The medicine update and the movement insert run in the same
   * transaction so they cannot drift.
   */
  async opname(
    dto: StockOpnameDto,
    userId: string,
  ): Promise<{
    id: string;
    medicineId: string;
    type: 'IN' | 'OUT';
    reason: 'ADJUSTMENT';
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

    if (dto.newStock === medicine.currentStock) {
      throw new BadRequestException(
        'Stok fisik sama dengan stok sistem, tidak ada perubahan',
      );
    }

    const stockBefore = medicine.currentStock;
    const stockAfter = dto.newStock;
    const delta = stockAfter - stockBefore;
    const type = delta > 0 ? StockMovementType.IN : StockMovementType.OUT;
    const quantity = Math.abs(delta);
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
          type,
          reason: StockMovementReason.ADJUSTMENT,
          quantity,
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
      type,
      reason: 'ADJUSTMENT',
      quantity: movement.quantity,
      stockBefore: movement.stockBefore,
      stockAfter: movement.stockAfter,
      transactionDate: movement.transactionDate.toISOString().slice(0, 10),
    };
  }

  /**
   * Bulk stock opname. The client sends a list of `{ medicineId, newStock,
   * notes? }` items plus an optional `transactionDate` that applies to all
   * successful movements. Each item is processed independently inside a
   * single Prisma transaction so the audit trail is atomic. Items that
   * fail (medicine not found, no-op) are reported per-item and do NOT
   * abort the rest of the batch. A real DB / constraint error will throw
   * and roll back everything.
   */
  async opnameBulk(
    dto: StockOpnameBulkDto,
    userId: string,
  ): Promise<StockOpnameBulkResultDto> {
    const transactionDate = dto.transactionDate
      ? new Date(dto.transactionDate)
      : new Date();

    // Pre-load all medicines in one round-trip. Items with unknown ids
    // will get a 'not_found' result without touching the DB twice.
    const uniqueIds = Array.from(new Set(dto.items.map((i) => i.medicineId)));
    const medicines = await this.prisma.medicine.findMany({
      where: { id: { in: uniqueIds } },
    });
    const medicineById = new Map(medicines.map((m) => [m.id, m]));

    const results: BulkOpnameItemResult[] = await this.prisma.$transaction(
      async (tx) => {
        const out: BulkOpnameItemResult[] = [];
        for (const item of dto.items) {
          const medicine = medicineById.get(item.medicineId);
          if (!medicine) {
            out.push({
              medicineId: item.medicineId,
              status: 'error',
              error: 'not_found',
              message: 'Medicine tidak ditemukan',
            });
            continue;
          }
          if (item.newStock === medicine.currentStock) {
            out.push({
              medicineId: item.medicineId,
              status: 'error',
              error: 'no_change',
              message:
                'Stok fisik sama dengan stok sistem, tidak ada perubahan',
            });
            continue;
          }
          const stockBefore = medicine.currentStock;
          const stockAfter = item.newStock;
          const delta = stockAfter - stockBefore;
          const type = delta > 0 ? StockMovementType.IN : StockMovementType.OUT;
          const quantity = Math.abs(delta);

          await tx.medicine.update({
            where: { id: medicine.id },
            data: { currentStock: stockAfter },
          });
          const movement = await tx.stockMovement.create({
            data: {
              medicineId: medicine.id,
              userId,
              type,
              reason: StockMovementReason.ADJUSTMENT,
              quantity,
              stockBefore,
              stockAfter,
              transactionDate,
              notes: item.notes ?? null,
            },
          });

          out.push({
            medicineId: medicine.id,
            status: 'ok',
            stockBefore,
            stockAfter,
            type,
            quantity,
            movementId: movement.id,
          });
        }
        return out;
      },
    );

    const summary = {
      total: results.length,
      succeeded: results.filter((r) => r.status === 'ok').length,
      failed: results.filter((r) => r.status === 'error').length,
    };

    return { data: results, summary };
  }
}
