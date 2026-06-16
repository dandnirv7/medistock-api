import { Test, TestingModule } from '@nestjs/testing';

import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';

describe('StockMovementsController', () => {
  let controller: StockMovementsController;
  let service: { list: jest.Mock; stockIn: jest.Mock; stockOut: jest.Mock };

  beforeEach(async () => {
    service = { list: jest.fn(), stockIn: jest.fn(), stockOut: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockMovementsController],
      providers: [{ provide: StockMovementsService, useValue: service }],
    }).compile();
    controller = module.get(StockMovementsController);
  });

  it('GET /stock-movements delegates to list', async () => {
    const env = {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
    service.list.mockResolvedValue(env);
    expect(await controller.list({ page: 1, limit: 10 })).toBe(env);
  });

  it('POST /stock-movements/in delegates to stockIn with user.id', async () => {
    service.stockIn.mockResolvedValue({ id: '1' });
    const dto = { medicineId: 'm', quantity: 1 } as never;
    const res = await controller.stockIn(dto, { id: 'u' } as never);
    expect(service.stockIn).toHaveBeenCalledWith(dto, 'u');
    expect(res.id).toBe('1');
  });

  it('POST /stock-movements/out delegates to stockOut with user.id', async () => {
    service.stockOut.mockResolvedValue({ id: '2' });
    const dto = { medicineId: 'm', quantity: 1, reason: 'SALE' } as never;
    const res = await controller.stockOut(dto, { id: 'u' } as never);
    expect(service.stockOut).toHaveBeenCalledWith(dto, 'u');
    expect(res.id).toBe('2');
  });
});
