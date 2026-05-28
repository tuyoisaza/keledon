import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateKnowledgeBaseDto {
  @ApiProperty({
    description: 'Owning company ID for the knowledge base',
    example: 'company_123',
  })
  companyId!: string;

  @ApiProperty({
    description: 'Human-readable knowledge base name',
    example: 'Returns Policies MX',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional description for operators',
    example: 'Customer support policies for Mexico',
  })
  description?: string;
}
