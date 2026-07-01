import { Module } from '@nestjs/common';

import { MedicineBatchesService } from './medicine-batches.service';

@Module({
  providers: [MedicineBatchesService],
  exports: [MedicineBatchesService],
})
export class MedicineBatchesModule {}
