export enum OrchestratorState {
    IDLE = 'IDLE',
    LISTENING = 'LISTENING',
    THINKING = 'THINKING',
    SPEAKING = 'SPEAKING',
    EXECUTING = 'EXECUTING',
    ERROR = 'ERROR'
}

export interface StateChangePayload {
    socketId: string;
    previousState: OrchestratorState;
    newState: OrchestratorState;
    timestamp: string;
    details?: string;
}
