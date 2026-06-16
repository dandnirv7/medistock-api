import { Injectable } from '@nestjs/common';
import { Prisma, StockMovementReason, StockMovementType } from '@prisma/client';
import { stringify } from 'csv-stringify/sync';

import { PrismaService } from '../database/prisma.service';
import { StockMovementReportQueryDto } from './dto/stock-movement-report-query.dto';

export interface StockMovementCsvRow {
  movementId: string;
  transactionDate: string;
  type: StockMovementType;
  reason: StockMovementReason;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  medicineCode: string;
  medicineName: string;
  medicineUnit: string;
  supplierName: string | null;
  userName: string;
  notes: string | null;
}

export interface LowStockCsvRow {
  medicineId: string;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  categoryName: string;
  supplierName: string | null;
}

export interface ExpiredSoonCsvRow {
  medicineId: string;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  expiredDate: string;
  daysUntilExpiry: number;
  categoryName: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stock movement export. Filters mirror the list endpoint. Returns
   * a CSV string with a UTF-8 BOM so Excel in Indonesian locale reads
   * the columns correctly.
   */
  async stockMovementsCsv(query: StockMovementReportQueryDto): Promise<string> {
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
    };

    const rows = await this.prisma.stockMovement.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      include: {
        medicine: { select: { code: true, name: true, unit: true } },
        supplier: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    const data: StockMovementCsvRow[] = rows.map((m) => ({
      movementId: m.id,
      transactionDate: m.transactionDate.toISOString().slice(0, 10),
      type: m.type,
      reason: m.reason,
      quantity: m.quantity,
      stockBefore: m.stockBefore,
      stockAfter: m.stockAfter,
      medicineCode: m.medicine.code,
      medicineName: m.medicine.name,
      medicineUnit: m.medicine.unit,
      supplierName: m.supplier?.name ?? null,
      userName: m.user.name,
      notes: m.notes,
    }));

    return this.toCsv(data, [
      'movementId',
      'transactionDate',
      'type',
      'reason',
      'quantity',
      'stockBefore',
      'stockAfter',
      'medicineCode',
      'medicineName',
      'medicineUnit',
      'supplierName',
      'userName',
      'notes',
    ]);
  }

  /**
   * Low stock export: every active medicine where
   * currentStock <= minimumStock. Excludes inactive medicines.
   */
  async lowStockCsv(): Promise<string> {
    const rows = await this.prisma.medicine.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ currentStock: 'asc' }, { name: 'asc' }],
      include: {
        category: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    });

    const data: LowStockCsvRow[] = rows
      .filter((m) => m.currentStock <= m.minimumStock)
      .map((m) => ({
        medicineId: m.id,
        code: m.code,
        name: m.name,
        unit: m.unit,
        currentStock: m.currentStock,
        minimumStock: m.minimumStock,
        categoryName: m.category.name,
        supplierName: m.supplier?.name ?? null,
      }));

    return this.toCsv(data, [
      'medicineId',
      'code',
      'name',
      'unit',
      'currentStock',
      'minimumStock',
      'categoryName',
      'supplierName',
    ]);
  }

  /**
   * Expired-soon export: every active medicine whose expiredDate
   * falls within 30 days from `now` (inclusive of today). Already-
   * expired medicines are excluded — a future "expired" report can
   * pull them in if needed. Filter is `expiredDate BETWEEN now AND
   * (now + 30 days)`.
   */
  async expiredSoonCsv(now: Date): Promise<string> {
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const soon = new Date(today);
    soon.setUTCDate(soon.getUTCDate() + 30);

    const rows = await this.prisma.medicine.findMany({
      where: {
        isActive: true,
        // Expiring within 30 days from `now` (inclusive of today).
        // Already-expired medicines are excluded; they belong in a
        // separate report if/when that becomes a need.
        expiredDate: {
          gte: today,
          lte: soon,
        },
      },
      orderBy: { expiredDate: 'asc' },
      include: { category: { select: { name: true } } },
    });

    const data: ExpiredSoonCsvRow[] = rows
      .filter((m) => m.expiredDate !== null)
      .map((m) => {
        const exp = m.expiredDate;
        const days = Math.round(
          (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          medicineId: m.id,
          code: m.code,
          name: m.name,
          unit: m.unit,
          currentStock: m.currentStock,
          expiredDate: exp.toISOString().slice(0, 10),
          daysUntilExpiry: days,
          categoryName: m.category.name,
        };
      });

    return this.toCsv(data, [
      'medicineId',
      'code',
      'name',
      'unit',
      'currentStock',
      'expiredDate',
      'daysUntilExpiry',
      'categoryName',
    ]);
  }

  /**
   * Serialize an array of objects to a CSV string with UTF-8 BOM.
   * The BOM (\uFEFF) tells Excel to interpret the file as UTF-8 so
   * Indonesian characters (obat, kategori) survive the round-trip.
   * Null values render as empty cells; everything else is escaped
   * by csv-stringify to survive commas, quotes, and newlines inside
   * free-text fields like notes.
   */
  private toCsv(data: object[], columns: string[]): string {
    const body = stringify(data, {
      header: true,
      columns: columns.map((key) => ({ key, header: key })),
    });
    return '\uFEFF' + body;
  }
}
