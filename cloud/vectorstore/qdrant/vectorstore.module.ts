import { Module } from '@nestjs/common';
import { VectorStoreService } from '../vectorstore/vector-store.service';

@Module({
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}