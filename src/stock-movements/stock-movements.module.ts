import { Module } from '@nestjs/common';

import { MedicineBatchesModule } from '../medicine-batches/medicine-batches.module';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';

@Module({
  imports: [MedicineBatchesModule],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
