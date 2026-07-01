import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { StockReportQueryDto } from './dto/stock-report-query.dto';

export interface StockReportBatch {
  batchNumber: string;
  expiredDate: string; // YYYY-MM-DD
  quantity: number;
}

export type StockStatus = 'low' | 'expired' | 'healthy';

export interface StockReportItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  categoryName: string;
  supplierName: string | null;
  status: StockStatus;
  batches: StockReportBatch[];
}

/**
 * Computes the stock status for a medicine given its batches.
 *
 * - low:     currentStock <= minimumStock
 * - expired: has ≥1 batch with expiredDate < today
 * - healthy: currentStock > minimumStock AND no expired batches
 *
 * Requirements: 3.5, 3.6, 3.7
 */
export function computeStatus(
  currentStock: number,
  minimumStock: number,
  batches: { expiredDate: Date }[],
  today: Date,
): StockStatus {
  const hasExpired = batches.some((b) => b.expiredDate < today);

  if (currentStock <= minimumStock) {
    return 'low';
  }

  if (hasExpired) {
    return 'expired';
  }

  return 'healthy';
}

@Injectable()
export class StockReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return stock report for all active medicines with their batches.
   *
   * Filters:
   *   - categoryId  (Req 3.3)
   *   - supplierId  (Req 3.4)
   *   - status      (Req 3.5–3.7; invalid value → caught by DTO before reaching here)
   *
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
   *
   * @param query  Validated query DTO from the controller.
   * @param now    Reference date for status computation (defaults to server Date).
   */
  async getStockReport(
    query: StockReportQueryDto,
    now: Date = new Date(),
  ): Promise<StockReportItem[]> {
    // Normalise `today` to midnight UTC so date comparisons are stable.
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    // Fetch all active medicines (with batches, category, supplier) whose
    // optional filters match. Status filtering is done in-process because
    // the status is a computed property that depends on batch data.
    const medicines = await this.prisma.medicine.findMany({
      where: {
        isActive: true,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      },
      include: {
        category: { select: { name: true } },
        supplier: { select: { name: true } },
        batches: {
          orderBy: { expiredDate: 'asc' },
          select: {
            batchNumber: true,
            expiredDate: true,
            quantity: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Map to report items (compute status per medicine) then apply optional
    // status filter.
    const items: StockReportItem[] = medicines.map((m) => {
      const status = computeStatus(
        m.currentStock,
        m.minimumStock,
        m.batches,
        today,
      );

      const batches: StockReportBatch[] = m.batches.map((b) => ({
        batchNumber: b.batchNumber,
        expiredDate: b.expiredDate.toISOString().slice(0, 10),
        quantity: b.quantity,
      }));

      return {
        id: m.id,
        code: m.code,
        name: m.name,
        unit: m.unit,
        currentStock: m.currentStock,
        minimumStock: m.minimumStock,
        categoryName: m.category.name,
        supplierName: m.supplier?.name ?? null,
        status,
        batches,
      };
    });

    if (!query.status) {
      return items;
    }

    return items.filter((item) => item.status === query.status);
  }
}
