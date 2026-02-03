import { Controller, Get, Post, Body, HttpException, HttpStatus, Query } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';

@Controller('api/knowledge')
export class KnowledgeController {
    constructor(private readonly knowledgeService: KnowledgeService) { }

    @Get('documents')
    async getDocuments() {
        return this.knowledgeService.listDocuments();
    }

    @Post('documents')
    async addDocument(@Body() body: { title: string; content: string; type: 'text' | 'url' }) {
        if (!body.title || !body.content) {
            throw new HttpException('Title and content are required', HttpStatus.BAD_REQUEST);
        }
        return this.knowledgeService.indexDocument(body.title, body.content, body.type);
    }

    @Post('query')
    async query(@Body() body: { query: string; limit?: number }) {
        if (!body.query) {
            throw new HttpException('Query required', HttpStatus.BAD_REQUEST);
        }
        return this.knowledgeService.queryKnowledgeBase(body.query, body.limit || 3);
    }
}
