import { NotFoundException } from '@nestjs/common';
import { StockMovementReason, StockMovementType } from '@prisma/client';

import { StockMovementsService } from './stock-movements.service';
import { StockInDto } from './dto/stock-in.dto';
import { StockOutDto } from './dto/stock-out.dto';

describe('StockMovementsService', () => {
  let prisma: {
    medicine: { findUnique: jest.Mock; update: jest.Mock };
    medicineBatch: { update: jest.Mock };
    supplier: { findUnique: jest.Mock };
    stockMovement: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };
  let medicineBatchesService: { listForFefo: jest.Mock };
  let service: StockMovementsService;

  beforeEach(() => {
    prisma = {
      medicine: { findUnique: jest.fn(), update: jest.fn() },
      medicineBatch: { update: jest.fn() },
      supplier: { findUnique: jest.fn() },
      stockMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    medicineBatchesService = { listForFefo: jest.fn() };
    service = new StockMovementsService(
      prisma as never,
      medicineBatchesService as never,
    );
  });

  describe('stockIn', () => {
    it('adds quantity and records IN/PURCHASE movement', async () => {
      prisma.medicine.findUnique.mockResolvedValue({
        id: 'm1',
        currentStock: 10,
      });
      prisma.$transaction.mockImplementation(
        (fn: (tx: typeof prisma) => unknown) => fn(prisma),
      );
      prisma.medicine.update.mockResolvedValue({});
      prisma.stockMovement.create.mockResolvedValue({
        id: 'mv-1',
        medicineId: 'm1',
        type: StockMovementType.IN,
        reason: StockMovementReason.PURCHASE,
        quantity: 5,
        stockBefore: 10,
        stockAfter: 15,
        transactionDate: new Date('2026-06-15'),
      });

      const dto: StockInDto = { medicineId: 'm1', quantity: 5 };
      const res = await service.stockIn(dto, 'u1');
      expect(res.stockBefore).toBe(10);
      expect(res.stockAfter).toBe(15);
      expect(res.type).toBe('IN');
      expect(res.reason).toBe('PURCHASE');
    });

    it('throws NotFound when medicine does not exist', async () => {
      prisma.medicine.findUnique.mockResolvedValue(null);
      await expect(
        service.stockIn({ medicineId: 'x', quantity: 1 }, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('stockOut', () => {
    it('subtracts quantity, consumes batches FEFO, and records OUT movement', async () => {
      prisma.medicine.findUnique.mockResolvedValue({
        id: 'm1',
        currentStock: 20,
      });
      medicineBatchesService.listForFefo.mockResolvedValue([
        {
          id: 'b1',
          medicineId: 'm1',
          batchNumber: 'B-001',
          expiredDate: new Date('2026-06-01'),
          quantity: 10,
          createdAt: new Date(),
        },
        {
          id: 'b2',
          medicineId: 'm1',
          batchNumber: 'B-002',
          expiredDate: new Date('2026-07-01'),
          quantity: 10,
          createdAt: new Date(),
        },
      ]);
      prisma.$transaction.mockImplementation(
        (fn: (tx: typeof prisma) => unknown) => fn(prisma),
      );
      prisma.medicine.update.mockResolvedValue({});
      prisma.medicineBatch.update.mockResolvedValue({});
      prisma.stockMovement.create.mockResolvedValue({
        id: 'mv-2',
        medicineId: 'm1',
        type: StockMovementType.OUT,
        reason: StockMovementReason.SALE,
        quantity: 3,
        stockBefore: 20,
        stockAfter: 17,
        transactionDate: new Date('2026-06-15'),
      });

      const dto: StockOutDto = {
        medicineId: 'm1',
        quantity: 3,
        reason: 'SALE',
      };
      const res = await service.stockOut(dto, 'u1');
      expect(res.stockAfter).toBe(17);
      expect(res.reason).toBe('SALE');
      // FEFO consumption: batch b1 consumed first
      expect(prisma.medicineBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { quantity: { decrement: 3 } },
      });
    });

    it('throws BusinessException INSUFFICIENT_STOCK when batch total < quantity', async () => {
      prisma.medicine.findUnique.mockResolvedValue({
        id: 'm1',
        currentStock: 5,
      });
      medicineBatchesService.listForFefo.mockResolvedValue([
        {
          id: 'b1',
          medicineId: 'm1',
          batchNumber: 'B-001',
          expiredDate: new Date('2026-06-01'),
          quantity: 5,
          createdAt: new Date(),
        },
      ]);
      // $transaction callback will be invoked and throw inside
      prisma.$transaction.mockImplementation(
        (fn: (tx: typeof prisma) => unknown) => fn(prisma),
      );

      await expect(
        service.stockOut(
          { medicineId: 'm1', quantity: 10, reason: 'SALE' } as never,
          'u1',
        ),
      ).rejects.toMatchObject({
        response: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Stok tidak mencukupi',
        },
      });
    });
  });
});
