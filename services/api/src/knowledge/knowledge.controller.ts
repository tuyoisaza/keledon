import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { CreateKnowledgeDocumentDto } from './dto/create-knowledge-document.dto';
import { IngestKnowledgeBaseDto } from './dto/ingest-knowledge-base.dto';
import { SearchKnowledgeDto } from './dto/search-knowledge.dto';

@ApiTags('Knowledge')
@Controller('api')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('knowledge-bases')
  @ApiOperation({ summary: 'Create a knowledge base' })
  async createKnowledgeBase(@Body() body?: CreateKnowledgeBaseDto) {
    if (!body) {
      throw new BadRequestException('Request body is required');
    }

    return this.knowledgeService.createKnowledgeBase(body);
  }

  @Post('knowledge-bases/:id/documents')
  @ApiOperation({ summary: 'Create a document in a knowledge base' })
  async createKnowledgeDocument(
    @Param('id') id: string,
    @Body() body?: CreateKnowledgeDocumentDto,
    @Query('companyId') companyId?: string,
  ) {
    if (!body) {
      throw new BadRequestException('Request body is required');
    }

    const requestBody: CreateKnowledgeDocumentDto = Object.assign(
      new CreateKnowledgeDocumentDto(),
      body,
      companyId ? { companyId } : {},
    );
    return this.knowledgeService.createKnowledgeDocument(id, requestBody);
  }

  @Post('knowledge-bases/:id/ingest')
  @ApiOperation({ summary: 'Chunk and ingest knowledge-base documents into Qdrant' })
  async ingestKnowledgeBase(
    @Param('id') id: string,
    @Body() body?: IngestKnowledgeBaseDto,
    @Query('companyId') companyId?: string,
  ) {
    const requestBody: IngestKnowledgeBaseDto = Object.assign(
      new IngestKnowledgeBaseDto(),
      body || {},
      companyId ? { companyId } : {},
    );
    return this.knowledgeService.ingestKnowledgeBase(id, requestBody);
  }

  @Post('knowledge/search')
  @ApiOperation({ summary: 'Search knowledge across one or more Qdrant knowledge collections' })
  async searchKnowledge(@Body() body?: SearchKnowledgeDto) {
    if (!body) {
      throw new BadRequestException('Request body is required');
    }

    return this.knowledgeService.searchKnowledge(body);
  }

  @Get('knowledge-bases/:id/stats')
  @ApiOperation({ summary: 'Get database and vector stats for a knowledge base' })
  async getKnowledgeBaseStats(@Param('id') id: string, @Query('companyId') companyId?: string) {
    return this.knowledgeService.getKnowledgeBaseStats(id, companyId);
  }
}
