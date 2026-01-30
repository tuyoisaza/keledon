import { Module } from '@nestjs/common';
import { RAGController, RAGService } from './rag.controller';

@Module({
  controllers: [RAGController],
  providers: [RAGService],
  exports: [RAGService],
})
export class RAGModule {}