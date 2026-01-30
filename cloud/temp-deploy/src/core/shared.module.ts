import { Module, Global } from '@nestjs/common';
import { SttFactory } from '../stt.factory';
import { TtsFactory } from '../tts.factory';
import { LlmFactory } from '../llm.factory';

@Global()
@Module({
    providers: [
        SttFactory,
        TtsFactory,
        LlmFactory,
    ],
    exports: [
        SttFactory,
        TtsFactory,
        LlmFactory,
    ]
})
export class SharedModule { }
