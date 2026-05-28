import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CallerDto {
  [key: string]: unknown;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  name?: string | null;
}

export class CreateCallDto {
  @ApiProperty()
  deviceId!: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  teamId?: string;

  @ApiPropertyOptional()
  keledonId?: string;

  @ApiPropertyOptional()
  language?: string;

  @ApiPropertyOptional({ type: CallerDto })
  caller?: CallerDto;

  @ApiPropertyOptional()
  state?: string;

  @ApiPropertyOptional()
  activeVendorId?: string;

  @ApiPropertyOptional()
  activeFlowId?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}

export class CreateCallEventDto {
  @ApiProperty()
  type!: string;

  @ApiPropertyOptional()
  source?: string;

  @ApiPropertyOptional()
  stateBefore?: string;

  @ApiPropertyOptional()
  stateAfter?: string;

  @ApiPropertyOptional()
  correlationId?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  timestamp?: string;
}

export class TranscriptTurnDto {
  @ApiProperty()
  text!: string;

  @ApiPropertyOptional()
  language?: string;

  @ApiPropertyOptional()
  source?: string;

  @ApiPropertyOptional()
  confidence?: number;

  @ApiPropertyOptional()
  isFinal?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}

export class DecideCallDto {
  @ApiPropertyOptional()
  text?: string;

  @ApiPropertyOptional()
  provider?: string;

  @ApiPropertyOptional()
  confidence?: number;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}

export class CloseCallDto {
  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  finalReport?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}

export class EscalateCallDto {
  @ApiProperty()
  trigger!: string;

  @ApiPropertyOptional()
  triggerType?: string;

  @ApiPropertyOptional()
  transcript?: string;

  @ApiPropertyOptional()
  instruction?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}
