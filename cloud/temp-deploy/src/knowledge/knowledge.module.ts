import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { SupabaseModule } from '../supabase';

@Module({
    imports: [SupabaseModule],
    controllers: [KnowledgeController],
    providers: [KnowledgeService],
    exports: [KnowledgeService],
})
export class KnowledgeModule { }
