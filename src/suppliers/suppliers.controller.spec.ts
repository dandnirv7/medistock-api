import { Test, TestingModule } from '@nestjs/testing';

import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

describe('SuppliersController', () => {
  let controller: SuppliersController;
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
      controllers: [SuppliersController],
      providers: [{ provide: SuppliersService, useValue: service }],
    }).compile();
    controller = module.get(SuppliersController);
  });

  it('GET /suppliers delegates to list', async () => {
    const env = {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
    service.list.mockResolvedValue(env);
    expect(await controller.list({ page: 1, limit: 10 })).toBe(env);
  });

  it('GET /suppliers/:id delegates to findOne', async () => {
    service.findOne.mockResolvedValue({ id: 's1' });
    expect(await controller.findOne('s1')).toEqual({ id: 's1' });
  });

  it('POST /suppliers delegates to create', async () => {
    service.create.mockResolvedValue({ id: 's1' });
    expect(await controller.create({ name: 'X' })).toEqual({
      id: 's1',
    });
  });

  it('PATCH /suppliers/:id delegates to update', async () => {
    service.update.mockResolvedValue({ id: 's1', name: 'Y' });
    expect(await controller.update('s1', { name: 'Y' })).toEqual({
      id: 's1',
      name: 'Y',
    });
  });

  it('DELETE /suppliers/:id returns null', async () => {
    service.softDelete.mockResolvedValue(undefined);
    expect(await controller.remove('s1')).toBeNull();
  });
});
