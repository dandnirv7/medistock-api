import { NotFoundException } from '@nestjs/common';

import { MedicinesService } from './medicines.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';

interface MedicineRow {
  id: string;
  code: string;
  name: string;
  unit: string;
  purchasePrice: { toFixed: () => string };
  sellingPrice: { toFixed: () => string };
  currentStock: number;
  minimumStock: number;
  expiredDate: Date | null;
  description: string | null;
  isActive: boolean;
  category: { id: string; name: string };
  supplier: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

function row(over: Partial<MedicineRow> = {}): MedicineRow {
  return {
    id: 'med-1',
    code: 'CODE-1',
    name: 'Paracetamol',
    unit: 'Tablet',
    purchasePrice: { toFixed: () => '250.00' },
    sellingPrice: { toFixed: () => '500.00' },
    currentStock: 20,
    minimumStock: 10,
    expiredDate: new Date('2099-01-01'),
    description: null,
    isActive: true,
    category: { id: 'cat-1', name: 'Analgesik' },
    supplier: { id: 'sup-1', name: 'PT KF' },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...over,
  };
}

describe('MedicinesService', () => {
  let prisma: {
    medicine: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    category: { findUnique: jest.Mock };
    supplier: { findUnique: jest.Mock };
    stockMovement: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: MedicinesService;

  beforeEach(() => {
    prisma = {
      medicine: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      category: { findUnique: jest.fn() },
      supplier: { findUnique: jest.fn() },
      stockMovement: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new MedicinesService(prisma as never);
  });

  describe('list', () => {
    it('returns paginated list with default filters', async () => {
      prisma.$transaction.mockResolvedValue([[row()], 1]);
      const res = await service.list({});
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
      expect(res.meta.page).toBe(1);
      expect(res.data[0].stockStatus).toBe('SAFE');
    });

    it('filters lowStock=true in memory', async () => {
      prisma.medicine.findMany.mockResolvedValue([
        row({ id: 'a', currentStock: 5, minimumStock: 10 }),
        row({ id: 'b', currentStock: 50, minimumStock: 10 }),
      ]);
      const res = await service.list({
        lowStock: true,
        page: 1,
        limit: 10,
      });
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe('a');
      expect(res.data[0].stockStatus).toBe('LOW_STOCK');
      expect(res.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns medicine with derived statuses', async () => {
      prisma.medicine.findUnique.mockResolvedValue(row());
      const res = await service.findOne('med-1');
      expect(res.id).toBe('med-1');
      expect(res.stockStatus).toBe('SAFE');
    });

    it('throws NotFound for unknown id', async () => {
      prisma.medicine.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates medicine, initial stock produces a movement', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1' });
      prisma.$transaction.mockImplementation(
        (fn: (tx: typeof prisma) => unknown) => fn(prisma),
      );
      prisma.medicine.create.mockResolvedValue({
        id: 'new-1',
        code: 'NEW',
        name: 'X',
        currentStock: 10,
      });
      prisma.stockMovement.create.mockResolvedValue({});

      const dto: CreateMedicineDto = {
        code: 'NEW',
        name: 'X',
        categoryId: 'cat-1',
        supplierId: 'sup-1',
        unit: 'Tablet',
        purchasePrice: 100,
        sellingPrice: 200,
        currentStock: 10,
        minimumStock: 5,
        expiredDate: '2099-12-31',
      };

      const res = await service.create(dto, 'user-1');
      expect(res.id).toBe('new-1');
      expect(prisma.stockMovement.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates medicine', async () => {
      prisma.medicine.findUnique.mockResolvedValue(row());
      prisma.medicine.update.mockResolvedValue({
        id: 'med-1',
        code: 'X',
        name: 'Y',
      });
      const dto: UpdateMedicineDto = { name: 'Y' };
      const res = await service.update('med-1', dto);
      expect(res.name).toBe('Y');
    });

    it('throws NotFound if missing', async () => {
      prisma.medicine.findUnique.mockResolvedValue(null);
      await expect(service.update('x', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
