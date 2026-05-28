import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';

@Controller('api/vector-store')
export class VectorStoreController {
  constructor(private readonly vectorStoreService: VectorStoreService) {}

  @Get('status')
  async getStatus() {
    return this.vectorStoreService.getStatus();
  }

  @Post('documents')
  async addDocument(@Body() document: any) {
    return this.vectorStoreService.addDocument(document);
  }

  @Put('documents/:id')
  async updateDocument(@Param('id') id: string, @Body() document: any) {
    return this.vectorStoreService.updateDocument(id, document);
  }

  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string) {
    return this.vectorStoreService.deleteDocument(id);
  }

  @Post('search')
  async search(@Body() body: { query: string; limit?: number; scoreThreshold?: number; category?: string[]; company_id?: string }) {
    return this.vectorStoreService.search(body.query, body);
  }

  @Get('documents')
  async listDocuments() {
    return this.vectorStoreService.listDocuments();
  }
}
