import { DashboardService } from './dashboard.service';

interface PrismaMedLike {
  id: string;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  expiredDate: Date | null;
}

describe('DashboardService', () => {
  function buildPrisma(opts: {
    totalMedicines?: number;
    totalStock?: number;
    totalValue?: number;
    categories?: number;
    suppliers?: number;
    medicines?: PrismaMedLike[];
  }) {
    const medicines = opts.medicines ?? [];
    return {
      medicine: {
        count: jest
          .fn()
          .mockResolvedValue(opts.totalMedicines ?? medicines.length),
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { currentStock: opts.totalStock ?? 0 } }),
        findMany: jest.fn().mockResolvedValue(medicines),
      },
      category: {
        count: jest.fn().mockResolvedValue(opts.categories ?? 0),
      },
      supplier: {
        count: jest.fn().mockResolvedValue(opts.suppliers ?? 0),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ total: opts.totalValue ?? 0 }]),
      $transaction: jest
        .fn()
        .mockImplementation(async (ops: Promise<unknown>[]) =>
          Promise.all(ops),
        ),
    };
  }

  it('includes totalValue equal to aggregate result', async () => {
    const prisma = buildPrisma({ totalValue: 1234567.89 });
    const service = new DashboardService(prisma as never);
    const summary = await service.summary();
    expect(summary.totalValue).toBe(1234567.89);
  });

  it('returns totalValue=0 when no active medicines', async () => {
    const prisma = buildPrisma({ totalValue: 0 });
    const service = new DashboardService(prisma as never);
    const summary = await service.summary();
    expect(summary.totalValue).toBe(0);
  });

  it('handles $queryRaw returning null total (COALESCE fallback)', async () => {
    const prisma = buildPrisma({});
    prisma.$queryRaw.mockResolvedValue([{ total: null }]);
    const service = new DashboardService(prisma as never);
    const summary = await service.summary();
    expect(summary.totalValue).toBe(0);
  });
});
