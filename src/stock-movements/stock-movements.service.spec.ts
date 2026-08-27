import { NotFoundException } from '@nestjs/common';
import { StockMovementReason, StockMovementType } from '@prisma/client';

import { StockMovementsService } from './stock-movements.service';
import { StockInDto } from './dto/stock-in.dto';
import { StockOutDto } from './dto/stock-out.dto';

describe('StockMovementsService', () => {
  let prisma: {
    medicine: { findUnique: jest.Mock; update: jest.Mock };
    supplier: { findUnique: jest.Mock };
    stockMovement: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: StockMovementsService;

  beforeEach(() => {
    prisma = {
      medicine: { findUnique: jest.fn(), update: jest.fn() },
      supplier: { findUnique: jest.fn() },
      stockMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    service = new StockMovementsService(prisma as never);
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
    it('subtracts quantity and records OUT movement', async () => {
      prisma.medicine.findUnique.mockResolvedValue({
        id: 'm1',
        currentStock: 20,
      });
      prisma.$transaction.mockImplementation(
        (fn: (tx: typeof prisma) => unknown) => fn(prisma),
      );
      prisma.medicine.update.mockResolvedValue({});
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
    });

    it('throws BusinessException INSUFFICIENT_STOCK when quantity > current', async () => {
      prisma.medicine.findUnique.mockResolvedValue({
        id: 'm1',
        currentStock: 5,
      });
      await expect(
        service.stockOut(
          { medicineId: 'm1', quantity: 10, reason: 'SALE' },
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
