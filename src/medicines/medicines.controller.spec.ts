import { Test, TestingModule } from '@nestjs/testing';

import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';

describe('MedicinesController', () => {
  let controller: MedicinesController;
  let service: {
    list: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      list: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicinesController],
      providers: [{ provide: MedicinesService, useValue: service }],
    }).compile();
    controller = module.get(MedicinesController);
  });

  it('GET /medicines delegates to service.list', async () => {
    const env = {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
    service.list.mockResolvedValue(env);
    expect(await controller.list({ page: 1, limit: 10 })).toBe(env);
  });

  it('POST /medicines passes user.id to service.create', async () => {
    service.create.mockResolvedValue({
      id: '1',
      code: 'X',
      name: 'Y',
      currentStock: 0,
    });
    const dto = {
      code: 'X',
      name: 'Y',
      categoryId: 'c',
      supplierId: 's',
      unit: 'Tablet',
      purchasePrice: 1,
      sellingPrice: 2,
      minimumStock: 1,
    } as never;
    const res = await controller.create(dto, { id: 'user-1' } as never);
    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
    expect(res.id).toBe('1');
  });

  it('DELETE /medicines/:id returns null on success', async () => {
    service.softDelete.mockResolvedValue(undefined);
    expect(await controller.remove('id-1')).toBeNull();
  });
});
