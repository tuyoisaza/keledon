import { Module } from '@nestjs/common';
import { RAGService } from './rag.service';

@Module({
  providers: [RAGService],
  exports: [RAGService],
})
export class RAGModule {}