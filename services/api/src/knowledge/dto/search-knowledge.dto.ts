import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KnowledgeSearchFiltersDto {
  @ApiPropertyOptional({ example: 'MX' })
  country?: string;

  @ApiPropertyOptional({ example: ['policy', 'faq'], type: [String] })
  category?: string[];

  @ApiPropertyOptional({ example: 'es-MX' })
  language?: string;

  @ApiPropertyOptional({ example: 'upload' })
  source?: string;

  @ApiPropertyOptional({ example: 'brand_456' })
  brandId?: string;
}

export class SearchKnowledgeDto {
  @ApiProperty({
    description: 'Free-text knowledge query',
    example: 'customer asks about refund',
  })
  query!: string;

  @ApiPropertyOptional({
    description: 'Optional knowledge base scope. Either knowledgeBaseId or companyId must be supplied.',
    example: 'kb_123',
  })
  knowledgeBaseId?: string;

  @ApiPropertyOptional({ example: 'company_123' })
  companyId?: string;

  @ApiPropertyOptional({ example: 'team_mx_support' })
  teamId?: string;

  @ApiPropertyOptional({ example: 'es-MX' })
  language?: string;

  @ApiPropertyOptional({ example: 5, default: 5 })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Optional score threshold passed through to Qdrant',
    example: 0.35,
  })
  scoreThreshold?: number;

  @ApiPropertyOptional({
    type: KnowledgeSearchFiltersDto,
    example: {
      country: 'MX',
      category: ['policy', 'faq'],
      language: 'es-MX',
    },
  })
  filters?: KnowledgeSearchFiltersDto;
}
