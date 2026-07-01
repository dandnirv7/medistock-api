import { Injectable } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';

import { BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../database/prisma.service';
import { StockOutReportQueryDto } from './dto/stock-out-report-query.dto';

export interface StockOutTop5Item {
  medicineId: string;
  code: string;
  name: string;
  totalQuantity: number;
  totalValue: number;
}

export interface StockOutReportResult {
  totalQuantity: number;
  totalValue: number;
  top5: StockOutTop5Item[];
}

@Injectable()
export class StockOutReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getStockOutReport(
    query: StockOutReportQueryDto,
  ): Promise<StockOutReportResult> {
    // Cross-field validation: date_from must not be after date_to
    if (query.date_from > query.date_to) {
      throw new BusinessException({
        code: 'INVALID_DATE',
        message: 'date_from must be less than or equal to date_to',
      });
    }

    // Build WHERE clause for stock_movements
    const where: Prisma.StockMovementWhereInput = {
      type: StockMovementType.OUT,
      transactionDate: {
        gte: new Date(query.date_from),
        lte: new Date(query.date_to),
      },
      ...(query.medicine_id ? { medicineId: query.medicine_id } : {}),
      ...(query.supplier_id
        ? { medicine: { supplierId: query.supplier_id } }
        : {}),
    };

    const movements = await this.prisma.stockMovement.findMany({
      where,
      select: {
        quantity: true,
        medicine: {
          select: {
            id: true,
            code: true,
            name: true,
            sellingPrice: true,
          },
        },
      },
    });

    // Empty dataset case
    if (movements.length === 0) {
      return { totalQuantity: 0, totalValue: 0, top5: [] };
    }

    // Aggregate totals and per-medicine sums
    let totalQuantity = 0;
    let totalValue = 0;

    // Map: medicineId → { code, name, totalQuantity, totalValue }
    const medicineMap = new Map<
      string,
      { code: string; name: string; totalQuantity: number; totalValue: number }
    >();

    for (const mov of movements) {
      const qty = mov.quantity;
      const price = Number(mov.medicine.sellingPrice);
      const value = qty * price;

      totalQuantity += qty;
      totalValue += value;

      const medId = mov.medicine.id;
      const existing = medicineMap.get(medId);
      if (existing) {
        existing.totalQuantity += qty;
        existing.totalValue += value;
      } else {
        medicineMap.set(medId, {
          code: mov.medicine.code,
          name: mov.medicine.name,
          totalQuantity: qty,
          totalValue: value,
        });
      }
    }

    // Build top5: sort desc by totalQuantity, take first 5
    const top5: StockOutTop5Item[] = Array.from(medicineMap.entries())
      .sort((a, b) => b[1].totalQuantity - a[1].totalQuantity)
      .slice(0, 5)
      .map(([medicineId, data]) => ({
        medicineId,
        code: data.code,
        name: data.name,
        totalQuantity: data.totalQuantity,
        totalValue: data.totalValue,
      }));

    return { totalQuantity, totalValue, top5 };
  }
}
