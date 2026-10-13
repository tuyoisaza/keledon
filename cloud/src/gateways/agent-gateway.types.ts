export interface AgentSocketData {
  event_id: string;
  session_id: string;
  timestamp: string;
  type: 'text_input' | 'ui_result' | 'system';
  payload: any;
  command_id?: string;
  agent_id?: string;
}

export interface CommandSocketData {
  command_id: string;
  session_id: string;
  timestamp: string;
  type: 'say' | 'ui_steps' | 'mode' | 'stop';
  payload: any;
}
