import { NotFoundException } from '@nestjs/common';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

describe('CategoriesService', () => {
  let prisma: {
    category: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: CategoriesService;

  beforeEach(() => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    service = new CategoriesService(prisma as never);
  });

  it('list returns paginated rows with medicineCount', async () => {
    prisma.$transaction.mockResolvedValue([
      [
        {
          id: 'c1',
          name: 'X',
          description: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { medicines: 3 },
        },
      ],
      1,
    ]);
    const res = await service.list({ page: 1, limit: 10 });
    expect(res.data[0].medicineCount).toBe(3);
    expect(res.meta.total).toBe(1);
  });

  it('findOne throws NotFound when missing', async () => {
    prisma.category.findUnique.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create persists a category and returns it', async () => {
    prisma.category.create.mockResolvedValue({
      id: 'c1',
      name: 'X',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { medicines: 0 },
    });
    const dto: CreateCategoryDto = { name: 'X' };
    const res = await service.create(dto);
    expect(res.name).toBe('X');
    expect(res.isActive).toBe(true);
  });

  it('softDelete flips isActive to false', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'c1',
      name: 'X',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { medicines: 0 },
    });
    prisma.category.update.mockResolvedValue({});
    await service.softDelete('c1');
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { isActive: false },
    });
  });
});
