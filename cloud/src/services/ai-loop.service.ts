import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

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
    console.log('AILoopService: Initialized (deterministic, real though empty)');
  }

  // Read paths: deterministic empty until backed by real persisted state.
  getAllLoops(): any[] {
    return [];
  }

  getLoop(_loopId: string): any | undefined {
    return undefined;
  }

  getLoopUpdates(): Observable<any> {
    return this.loopUpdates.asObservable();
  }

  // Mutations: fail-fast (no simulated success).
  createLoop(_name: string): never {
    throw new Error('AILoopService.createLoop not implemented (no simulated loops).');
  }

  startLoop(_loopId: string): never {
    throw new Error('AILoopService.startLoop not implemented (cloud orchestrator required).');
  }

  resetLoop(_loopId: string): never {
    throw new Error('AILoopService.resetLoop not implemented.');
  }

  pauseLoop(_loopId: string): never {
    throw new Error('AILoopService.pauseLoop not implemented.');
  }

  deleteLoop(_loopId: string): never {
    throw new Error('AILoopService.deleteLoop not implemented.');
  }
}
