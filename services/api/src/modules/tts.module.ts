import { Module } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { TTSFactory } from '../audio/tts/index.js';

@Module({})
@Injectable()
export class TTSModule {
  static registerProviders() {
    return {
      provide: [TTSFactory],
      useFactory: () => TTSFactory,
      scope: 'transient',
    };
  }

  static forRoot() {
    return {
      module: TTSModule,
      providers: [TTSFactory],
      exports: [TTSFactory],
    };
  }
}