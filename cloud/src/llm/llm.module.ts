import { Module } from '@nestjs/common';
import { LLMService } from './llm.service';
import { ManagedAiRuntime } from './managed-ai-runtime';

@Module({
  providers: [LLMService, ManagedAiRuntime],
  exports: [LLMService],
})
export class LLMModule {}
