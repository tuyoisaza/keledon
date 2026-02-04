import { Module } from '@nestjs/common';
import { RealVectorStoreService } from './real-vector-store.service';

@Module({
  providers: [RealVectorStoreService],
  exports: [RealVectorStoreService],
})
export class VectorStoreModule {}