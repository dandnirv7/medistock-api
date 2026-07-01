import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { EXPIRED_SOON_DAYS } from '../medicines/medicines.helpers';
import { toMidnightUtc } from './dashboard.service';

export interface MedicineAlertBatch {
  batchNumber: string;
  expiredDate: string; // YYYY-MM-DD
  quantity: number;
}

export interface MedicineAlertItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  batches: MedicineAlertBatch[];
}

export interface ExpiryAlerts {
  expiringSoon: MedicineAlertItem[];
  alreadyExpired: MedicineAlertItem[];
}

@Injectable()
export class ExpiryAlertService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns two lists:
   *  - expiringSoon:   medicines with ≥1 batch expiredDate ∈ [today, today+30] inclusive
   *  - alreadyExpired: medicines with ≥1 batch expiredDate < today
   *
   * @param now  Server date override (for testing); defaults to `new Date()`.
   */
  async getAlerts(now?: Date): Promise<ExpiryAlerts> {
    const today = toMidnightUtc(now);
    const soon = new Date(today);
    soon.setUTCDate(soon.getUTCDate() + EXPIRED_SOON_DAYS);

    const [expiringSoonRaw, alreadyExpiredRaw] = await Promise.all([
      // Medicines with ≥1 batch expiring within the next 30 days (inclusive)
      this.prisma.medicine.findMany({
        where: {
          isActive: true,
          batches: {
            some: {
              expiredDate: { gte: today, lte: soon },
            },
          },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          unit: true,
          currentStock: true,
          batches: {
            where: {
              expiredDate: { gte: today, lte: soon },
            },
            orderBy: { expiredDate: 'asc' },
            select: {
              batchNumber: true,
              expiredDate: true,
              quantity: true,
            },
          },
        },
      }),

      // Medicines with ≥1 batch already expired
      this.prisma.medicine.findMany({
        where: {
          isActive: true,
          batches: {
            some: {
              expiredDate: { lt: today },
            },
          },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          unit: true,
          currentStock: true,
          batches: {
            where: {
              expiredDate: { lt: today },
            },
            orderBy: { expiredDate: 'asc' },
            select: {
              batchNumber: true,
              expiredDate: true,
              quantity: true,
            },
          },
        },
      }),
    ]);

    const mapItem = (m: {
      id: string;
      code: string;
      name: string;
      unit: string;
      currentStock: number;
      batches: { batchNumber: string; expiredDate: Date; quantity: number }[];
    }): MedicineAlertItem => ({
      id: m.id,
      code: m.code,
      name: m.name,
      unit: m.unit,
      currentStock: m.currentStock,
      batches: m.batches.map((b) => ({
        batchNumber: b.batchNumber,
        expiredDate: b.expiredDate.toISOString().slice(0, 10),
        quantity: b.quantity,
      })),
    });

    return {
      expiringSoon: expiringSoonRaw.map(mapItem),
      alreadyExpired: alreadyExpiredRaw.map(mapItem),
    };
  }
}
