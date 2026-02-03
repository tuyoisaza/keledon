export class CreateSessionDto {
  name?: string;
  agent_id: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

export class UpdateSessionDto {
  name?: string;
  status?: 'active' | 'paused' | 'ended' | 'error';
  metadata?: Record<string, any>;
}

export class CreateEventDto {
  type: 'text_input' | 'ui_result' | 'system';
  payload: Record<string, any>;
  agent_id?: string;
  timestamp?: Date;
}