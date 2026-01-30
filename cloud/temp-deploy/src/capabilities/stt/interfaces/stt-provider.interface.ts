export interface TranscriptPart {
    speaker: 'agent' | 'customer';
    text: string;
    isFinal: boolean;
    timestamp: string;
}

import { Observable } from 'rxjs';

export interface SttProvider {
    processAudio(audioData: any): Promise<TranscriptPart | null>;
    disconnect?(): void;
    transcript$?: Observable<TranscriptPart>;
}
