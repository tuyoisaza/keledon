import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { VectorStoreScope, VectorStoreService } from './vector-store.service';
import { ResourceScopeGuard } from '../guards/resource-scope.guard';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Controller('api/vector-store')
@UseGuards(ResourceScopeGuard)
export class VectorStoreController {
  constructor(private readonly vectorStoreService: VectorStoreService) {}

  @Get('status')
  async getStatus(@Req() req: { vectorScope?: VectorStoreScope }) {
    return this.vectorStoreService.getStatus(req.vectorScope);
  }

  @Post('documents')
  async addDocument(@Body() document: unknown) {
    return this.vectorStoreService.addDocument(document);
  }

  @Put('documents/:id')
  async updateDocument(
    @Param('id') id: string,
    @Body() document: unknown,
    @Req() req: { vectorScope?: VectorStoreScope },
  ) {
    return this.vectorStoreService.updateDocument(
      id,
      document,
      req.vectorScope,
    );
  }

  @Delete('documents/:id')
  async deleteDocument(
    @Param('id') id: string,
    @Req() req: { vectorScope?: VectorStoreScope },
  ) {
    return this.vectorStoreService.deleteDocument(id, req.vectorScope);
  }

  @Post('search')
  async search(@Body() body: unknown) {
    const searchBody = isRecord(body) ? body : {};
    return this.vectorStoreService.search(searchBody.query, searchBody);
  }

  @Get('documents')
  async listDocuments(@Req() req: { vectorScope?: VectorStoreScope }) {
    return this.vectorStoreService.listDocuments(req.vectorScope);
  }
}
