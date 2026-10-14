import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { ResourceScopeGuard } from '../guards/resource-scope.guard';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Controller('api/vector-store')
@UseGuards(ResourceScopeGuard)
export class VectorStoreController {
  constructor(private readonly vectorStoreService: VectorStoreService) {}

  @Get('status')
  async getStatus() {
    return this.vectorStoreService.getStatus();
  }

  @Post('documents')
  async addDocument(@Body() document: unknown) {
    return this.vectorStoreService.addDocument(document);
  }

  @Put('documents/:id')
  async updateDocument(@Param('id') id: string, @Body() document: unknown) {
    return this.vectorStoreService.updateDocument(id, document);
  }

  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string) {
    return this.vectorStoreService.deleteDocument(id);
  }

  @Post('search')
  async search(@Body() body: unknown) {
    const searchBody = isRecord(body) ? body : {};
    return this.vectorStoreService.search(searchBody.query, searchBody);
  }

  @Get('documents')
  async listDocuments() {
    return this.vectorStoreService.listDocuments();
  }
}
