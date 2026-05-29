import { ApiPropertyOptional } from '@nestjs/swagger';

export class IngestKnowledgeBaseDto {
  @ApiPropertyOptional({
    description:
      'Optional company ownership check for the target knowledge base',
    example: 'company_123',
  })
  companyId?: string;

  @ApiPropertyOptional({
    description:
      'Restrict ingestion to a subset of documents in this knowledge base',
    example: ['doc_1', 'doc_2'],
    type: [String],
  })
  documentIds?: string[];

  @ApiPropertyOptional({
    description: 'Approximate chunk size in characters',
    example: 900,
    default: 900,
  })
  chunkSize?: number;

  @ApiPropertyOptional({
    description: 'Character overlap between adjacent chunks',
    example: 120,
    default: 120,
  })
  chunkOverlap?: number;
}
