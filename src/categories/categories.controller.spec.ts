import { Test, TestingModule } from '@nestjs/testing';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
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
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: service }],
    }).compile();
    controller = module.get(CategoriesController);
  });

  it('GET /categories delegates to service.list', async () => {
    const env = {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
    service.list.mockResolvedValue(env);
    expect(await controller.list({ page: 1, limit: 10 })).toBe(env);
  });

  it('GET /categories/:id delegates to findOne', async () => {
    const item = { id: 'c1', name: 'X' };
    service.findOne.mockResolvedValue(item);
    expect(await controller.findOne('c1')).toBe(item);
  });

  it('POST /categories delegates to create', async () => {
    const dto = { name: 'X' };
    service.create.mockResolvedValue({ id: 'c1' });
    expect(await controller.create(dto as never)).toEqual({ id: 'c1' });
  });

  it('PATCH /categories/:id delegates to update', async () => {
    const dto = { name: 'Y' };
    service.update.mockResolvedValue({ id: 'c1', name: 'Y' });
    expect(await controller.update('c1', dto as never)).toEqual({
      id: 'c1',
      name: 'Y',
    });
  });

  it('DELETE /categories/:id returns null after softDelete', async () => {
    service.softDelete.mockResolvedValue(undefined);
    expect(await controller.remove('c1')).toBeNull();
  });
});
