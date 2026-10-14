import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface AILoop {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  startTime?: Date;
}

/**
 * AI Loop Service (Canon-enforced)
 *
 * MVP = real though empty.
 * - No simulated execution
 * - No Math.random
 * - No demo loops
 *
 * This service is intentionally minimal until a canonical persistence model exists.
 */
@Injectable()
export class AILoopService {
  private readonly loopUpdates = new Subject<any>();

  constructor() {
    console.log(
      'AILoopService: Initialized (deterministic, real though empty)',
    );
  }

  // Read paths: deterministic empty until backed by real persisted state.
  getAllLoops(): AILoop[] {
    return [];
  }

  getLoop(loopId: string): AILoop | undefined {
    void loopId;
    return undefined;
  }

  getLoopUpdates(): Observable<any> {
    return this.loopUpdates.asObservable();
  }

  // Mutations: fail-fast (no simulated success).
  createLoop(name: string): never {
    void name;
    throw new Error(
      'AILoopService.createLoop not implemented (no simulated loops).',
    );
  }

  startLoop(loopId: string): never {
    void loopId;
    throw new Error(
      'AILoopService.startLoop not implemented (cloud orchestrator required).',
    );
  }

  resetLoop(loopId: string): never {
    void loopId;
    throw new Error('AILoopService.resetLoop not implemented.');
  }

  pauseLoop(loopId: string): never {
    void loopId;
    throw new Error('AILoopService.pauseLoop not implemented.');
  }

  deleteLoop(loopId: string): never {
    void loopId;
    throw new Error('AILoopService.deleteLoop not implemented.');
  }
}
