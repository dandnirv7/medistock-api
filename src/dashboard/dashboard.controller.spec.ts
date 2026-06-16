import { Test, TestingModule } from '@nestjs/testing';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: { summary: jest.Mock };

  beforeEach(async () => {
    service = { summary: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: service }],
    }).compile();
    controller = module.get(DashboardController);
  });

  it('GET /dashboard/summary delegates to service.summary', async () => {
    const payload = {
      totalMedicines: 1,
      totalStock: 10,
      totalValue: 12345.67,
      totalCategories: 1,
      totalSuppliers: 1,
      lowStockCount: 0,
      expiredSoonCount: 0,
      expiredCount: 0,
      lowStockMedicines: [],
      expiredSoonMedicines: [],
    };
    service.summary.mockResolvedValue(payload);
    expect(await controller.summary()).toBe(payload);
  });
});
