import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Vector Store')
@Controller('api/vector-store')
export class VectorStoreController {
  constructor(private readonly vectorStoreService: VectorStoreService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get status for the default vector collection' })
  async getStatus() {
    return this.vectorStoreService.getStatus();
  }

  @Get('collections')
  @ApiOperation({ summary: 'List available Qdrant collections' })
  async getCollections(@Query('prefix') prefix?: string) {
    return this.vectorStoreService.getCollections(prefix);
  }

  @Get('collections/:name/stats')
  @ApiOperation({ summary: 'Get stats for a Qdrant collection' })
  async getCollectionStats(@Param('name') name: string) {
    return this.vectorStoreService.getCollectionStats(name);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Add a document to the default vector collection' })
  async addDocument(@Body() document: any) {
    return this.vectorStoreService.addDocument(document);
  }

  @Put('documents/:id')
  @ApiOperation({ summary: 'Update a document in the default vector collection' })
  async updateDocument(@Param('id') id: string, @Body() document: any) {
    return this.vectorStoreService.updateDocument(id, document);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document from the default vector collection' })
  async deleteDocument(@Param('id') id: string) {
    return this.vectorStoreService.deleteDocument(id);
  }

  @Post('search')
  @ApiOperation({ summary: 'Search the default vector collection' })
  async search(@Body() body: { query: string; limit?: number; scoreThreshold?: number; category?: string[]; company_id?: string }) {
    return this.vectorStoreService.search(body.query, body);
  }

  @Get('documents')
  @ApiOperation({ summary: 'List documents from the default vector collection' })
  async listDocuments() {
    return this.vectorStoreService.listDocuments();
  }
}
