import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrowserCommandResultEvidenceDto {
  @ApiProperty()
  type!: string;

  @ApiPropertyOptional()
  ref?: string;

  @ApiPropertyOptional()
  content?: string;
}

export class CommandResultDto {
  @ApiProperty()
  commandId!: string;

  @ApiProperty()
  status!: 'completed' | 'failed' | 'partial';

  @ApiPropertyOptional()
  startedAt?: string;

  @ApiPropertyOptional()
  completedAt?: string;

  @ApiPropertyOptional({ type: [BrowserCommandResultEvidenceDto] })
  evidence?: BrowserCommandResultEvidenceDto[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  extracted?: Record<string, unknown>;

  @ApiPropertyOptional()
  error?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}
