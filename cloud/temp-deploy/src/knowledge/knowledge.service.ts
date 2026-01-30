import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import OpenAI from 'openai';

@Injectable()
export class KnowledgeService {
    private readonly logger = new Logger(KnowledgeService.name);
    private openai: OpenAI | null = null;

    constructor(private readonly supabaseService: SupabaseService) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        } else {
            this.logger.warn('OPENAI_API_KEY not found. KnowledgeService will operate in MOCK/DISABLED mode.');
        }
    }

    async listDocuments() {
        const { data, error } = await this.supabaseService.getClient()
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async indexDocument(title: string, content: string, type: 'text' | 'url') {
        this.logger.log(`Indexing document: ${title}`);

        // 1. Create Document Record
        const { data: doc, error: docError } = await this.supabaseService.getClient()
            .from('documents')
            .insert({
                title,
                type,
                status: 'indexing',
                size_bytes: content.length,
            })
            .select()
            .single();

        if (docError) throw docError;

        try {
            // 2. Chunk Content
            if (!this.openai) throw new Error('OpenAI not configured');
            const chunks = this.chunkText(content, 1000, 200);
            this.logger.log(`Created ${chunks.length} chunks for ${title}`);

            // 3. Generate Embeddings & Store
            for (let i = 0; i < chunks.length; i++) {
                const chunkContent = chunks[i];
                const embeddingResponse = await this.openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: chunkContent,
                });
                const embedding = embeddingResponse.data[0].embedding;

                await this.supabaseService.getClient()
                    .from('document_chunks')
                    .insert({
                        document_id: doc.id,
                        content: chunkContent,
                        embedding,
                        chunk_index: i,
                    });
            }

            // 4. Update Status
            await this.supabaseService.getClient()
                .from('documents')
                .update({ status: 'indexed', chunk_count: chunks.length })
                .eq('id', doc.id);

            return { ...doc, status: 'indexed', chunk_count: chunks.length };
        } catch (error) {
            this.logger.error(`Failed to index document ${doc.id}:`, error);
            await this.supabaseService.getClient()
                .from('documents')
                .update({ status: 'error' })
                .eq('id', doc.id);
            throw error;
        }
    }

    async queryKnowledgeBase(query: string, limit: number = 3) {
        if (!this.openai) return [];
        // 1. Generate query embedding
        const embeddingResponse = await this.openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: query,
        });
        const queryEmbedding = embeddingResponse.data[0].embedding;

        // 2. Search via Supabase RPC (or direct vector match if we implemented the function, 
        // but for now, we'll try to just match. Actually, Supabase js client doesn't 
        // support direct vector ops easily without an RPC function usually. 
        // Let's assume we need an RPC or we can use the filter.
        // Wait, the client DOES support it if we enabled the extension and use rpc.
        // Let's try to query directly using the client's rpc if a function exists, 
        // OR we will create a simple stored procedure in the schema update if needed.
        // For now, I'll assume we can use the `match_documents` pattern common in Supabase.)

        // Since I haven't created the RPC, I will do it here. 
        // Actually, I can't create RPC from here easily. 
        // I should have added the RPC in the SQL file. 
        // I will use a raw query if possible or fallback to a simple exact match (which won't work).

        // CRITICAL FIX: I need to add that RPC function to the SQL schema.
        // I will return a placeholder for now and I MUST update the SQL schema to include the match functions.

        // BUT! I can use a raw SQL query via rpc if I define it.
        // Let's rely on an RPC named 'match_documents' that I will add to the SQL file in the next step.

        const { data, error } = await this.supabaseService.getClient()
            .rpc('match_documents', {
                query_embedding: queryEmbedding,
                match_threshold: 0.5,
                match_count: limit,
            });

        if (error) {
            this.logger.error('RAG Query Error:', error);
            return [];
        }
        return data;
    }

    private chunkText(text: string, size: number, overlap: number): string[] {
        const chunks: string[] = [];
        let start = 0;
        while (start < text.length) {
            const end = Math.min(start + size, text.length);
            chunks.push(text.slice(start, end));
            start += size - overlap;
        }
        return chunks;
    }
}
