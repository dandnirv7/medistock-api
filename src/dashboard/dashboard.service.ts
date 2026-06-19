import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import {
  computeExpiredStatus,
  computeStockStatus,
  EXPIRED_SOON_DAYS,
} from '../medicines/medicines.helpers';

export interface LowStockMedicine {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
}

export interface ExpiredSoonMedicine {
  id: string;
  code: string;
  name: string;
  expiredDate: string;
  currentStock: number;
  unit: string;
}

export interface DashboardSummary {
  totalMedicines: number;
  totalStock: number;
  totalValue: number;
  totalCategories: number;
  totalSuppliers: number;
  lowStockCount: number;
  expiredSoonCount: number;
  expiredCount: number;
  lowStockMedicines: LowStockMedicine[];
  expiredSoonMedicines: ExpiredSoonMedicine[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<DashboardSummary> {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const soon = new Date(today);
    soon.setUTCDate(soon.getUTCDate() + EXPIRED_SOON_DAYS);

    const [
      totalMedicines,
      totalStockAggregate,
      totalValueAggregate,
      totalCategories,
      totalSuppliers,
      allMedicines,
    ] = await this.prisma.$transaction([
      this.prisma.medicine.count({ where: { isActive: true } }),
      this.prisma.medicine.aggregate({
        _sum: { currentStock: true },
        where: { isActive: true },
      }),
      // totalValue = sum(purchasePrice * currentStock) for active medicines.
      // Prisma has no product aggregate, so we use $queryRaw with COALESCE.
      this.prisma.$queryRaw<Array<{ total: number | null }>>`
        SELECT COALESCE(SUM("purchase_price" * "current_stock"), 0)::float AS total
        FROM medicines
        WHERE "is_active" = true
      `,
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.supplier.count({ where: { isActive: true } }),
      this.prisma.medicine.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          unit: true,
          currentStock: true,
          minimumStock: true,
          expiredDate: true,
        },
      }),
    ]);

    const lowStock: LowStockMedicine[] = [];
    const expiredSoon: ExpiredSoonMedicine[] = [];
    let expiredCount = 0;

    for (const m of allMedicines) {
      const stockStatus = computeStockStatus(m.currentStock, m.minimumStock);
      const expiredStatus = computeExpiredStatus(m.expiredDate, now);

      if (stockStatus === 'LOW_STOCK') {
        lowStock.push({
          id: m.id,
          code: m.code,
          name: m.name,
          currentStock: m.currentStock,
          minimumStock: m.minimumStock,
          unit: m.unit,
        });
      }
      if (expiredStatus === 'EXPIRED') {
        expiredCount += 1;
      } else if (expiredStatus === 'EXPIRED_SOON') {
        expiredSoon.push({
          id: m.id,
          code: m.code,
          name: m.name,
          expiredDate: m.expiredDate.toISOString().slice(0, 10),
          currentStock: m.currentStock,
          unit: m.unit,
        });
      }
    }

    return {
      totalMedicines,
      totalStock: totalStockAggregate._sum.currentStock ?? 0,
      totalValue: Number(totalValueAggregate[0]?.total ?? 0),
      totalCategories,
      totalSuppliers,
      lowStockCount: lowStock.length,
      expiredSoonCount: expiredSoon.length,
      expiredCount,
      lowStockMedicines: lowStock,
      expiredSoonMedicines: expiredSoon,
    };
  }
}
