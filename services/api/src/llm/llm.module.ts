import { AiAdminModule } from '../ai-admin/ai-admin.module';
import { Module } from '@nestjs/common';
import { LLMService } from './llm.service';

@Module({
  imports: [AiAdminModule],
  providers: [LLMService],
  exports: [LLMService],
})
export class LLMModule {}
