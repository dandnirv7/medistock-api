import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

/**
 * Prisma interactive transaction client type.
 * Derived from PrismaClient so it stays in sync with the generated client
 * without introducing a manual alias that can drift.
 */
export type PrismaTx = Parameters<PrismaClient['$transaction']>[0] extends (
  tx: infer T,
) => unknown
  ? T
  : never;

export interface BatchInput {
  medicineId: string;
  batchNumber: string;
  expiredDate: Date; // date-only
  quantity: number; // > 0
}

export interface MedicineBatchRow {
  id: string;
  medicineId: string;
  batchNumber: string;
  expiredDate: Date;
  quantity: number;
  createdAt: Date;
}

export interface BatchView {
  id: string;
  batchNumber: string;
  expiredDate: string; // YYYY-MM-DD
  quantity: number;
}

@Injectable()
export class MedicineBatchesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert a batch record on stock-in.
   *
   * Called INSIDE a shared Prisma `$transaction` (tx). If the
   * `(medicineId, batchNumber, expiredDate)` triple already exists the
   * existing row's `quantity` is incremented; otherwise a new row is
   * inserted with `quantity` set to `input.quantity`.
   *
   * Requirements: 1.3, 1.8
   */
  async upsertOnStockIn(tx: PrismaTx, input: BatchInput): Promise<void> {
    await tx.medicineBatch.upsert({
      where: {
        medicineId_batchNumber_expiredDate: {
          medicineId: input.medicineId,
          batchNumber: input.batchNumber,
          expiredDate: input.expiredDate,
        },
      },
      create: {
        medicineId: input.medicineId,
        batchNumber: input.batchNumber,
        expiredDate: input.expiredDate,
        quantity: input.quantity,
      },
      update: {
        quantity: { increment: input.quantity },
      },
    });
  }

  /**
   * Return batches for FEFO (First-Expired First-Out) selection.
   *
   * Called INSIDE a shared Prisma `$transaction` (tx).
   * Returns only batches with `quantity > 0`, ordered by
   * `expired_date ASC, created_at ASC` for deterministic tiebreaking.
   *
   * Requirements: 2.1, 2.7
   */
  async listForFefo(
    tx: PrismaTx,
    medicineId: string,
  ): Promise<MedicineBatchRow[]> {
    return tx.medicineBatch.findMany({
      where: {
        medicineId,
        quantity: { gt: 0 },
      },
      orderBy: [{ expiredDate: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        medicineId: true,
        batchNumber: true,
        expiredDate: true,
        quantity: true,
        createdAt: true,
      },
    });
  }

  /**
   * Return all batches for a medicine (read-only, no transaction).
   *
   * Used by `GET /medicines/:id` and the stock report to display batch
   * details for a medicine. Ordered by `expired_date ASC`.
   *
   * Requirements: 1.9 (via medicine detail), 3.2 (via stock report)
   */
  async listByMedicine(medicineId: string): Promise<BatchView[]> {
    const rows = await this.prisma.medicineBatch.findMany({
      where: { medicineId },
      orderBy: { expiredDate: 'asc' },
      select: {
        id: true,
        batchNumber: true,
        expiredDate: true,
        quantity: true,
      },
    });

    return rows.map((r) => ({
      id: r.id,
      batchNumber: r.batchNumber,
      expiredDate: r.expiredDate.toISOString().slice(0, 10),
      quantity: r.quantity,
    }));
  }
}
