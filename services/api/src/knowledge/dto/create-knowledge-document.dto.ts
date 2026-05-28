import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateKnowledgeDocumentDto {
  @ApiPropertyOptional({
    description: 'Optional company ownership check for the target knowledge base',
    example: 'company_123',
  })
  companyId?: string;

  @ApiProperty({
    description: 'Document title',
    example: 'Return Policy MX',
  })
  title!: string;

  @ApiProperty({
    description: 'Raw source content to ingest',
    example: 'Customers may return unopened products within 30 days...',
  })
  content!: string;

  @ApiPropertyOptional({
    description: 'Metadata stored with the document and copied to Qdrant chunks',
    example: {
      companyId: 'company_123',
      teamId: 'team_mx_support',
      brandId: 'brand_456',
      country: 'MX',
      category: 'policy',
      source: 'upload',
      language: 'es-MX',
      effectiveDate: '2026-05-28',
    },
  })
  metadata?: Record<string, unknown>;
}
