import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface TranscriptPart {
    speaker: 'agent' | 'customer';
    text: string;
    isFinal: boolean;
    timestamp: string;
}

@Injectable()
export class MockSttService {
    private transcriptSubject = new Subject<TranscriptPart>();
    public transcript$ = this.transcriptSubject.asObservable();

    private mockPhrases = [
        "Entendido, estoy procesando su solicitud.",
        "¿Podría repetir el número de orden?",
        "Verificando en la base de datos...",
        "La operación ha sido exitosa.",
        "Disculpe, no le escuché bien.",
        "Conectando con el sistema central...",
        "El cliente pregunta por el estado de su ticket.",
        "Confirmando identidad del usuario."
    ];

    processAudio(clientSocketId: string, audioChunk: any) {
        // 10% chance to generate text per chunk to simulate sporadic speech
        if (Math.random() > 0.9) {
            const text = this.mockPhrases[Math.floor(Math.random() * this.mockPhrases.length)];

            const part: TranscriptPart = {
                speaker: 'agent', // Simulating Agent speaking for now (or what Agent hears)
                text: text + ' ',
                isFinal: false, // Stream parts are usually partial
                timestamp: new Date().toLocaleTimeString()
            };

            this.transcriptSubject.next({ ...part, text }); // In real app, we might tag with socketId
            return part;
        }
        return null;
    }
}
