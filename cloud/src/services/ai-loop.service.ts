import { Injectable } from '@nestjs/common';
import { Observable, Subject, interval } from 'rxjs';

@Injectable()
export class AILoopService {
  private loops = new Map<string, any>();
  private loopUpdates = new Subject<any>();

  constructor() {
    console.log('AILoopService: Initialized');
  }

  createLoop(name: string): any {
    const loop = {
      id: `loop_${Date.now()}`,
      name: name || `AI Loop ${this.loops.size + 1}`,
      status: 'idle',
      steps: this.getDefaultSteps(),
      currentStepIndex: 0,
      totalSteps: 5,
      progress: 0,
      startTime: undefined,
      endTime: undefined,
      performance: {
        avgStepTime: 0,
        successRate: 0,
        totalDuration: 0
      }
    };

    this.loops.set(loop.id, loop);
    this.broadcastLoopUpdate(loop);
    return loop;
  }

  startLoop(loopId: string): void {
    const loop = this.loops.get(loopId);
    if (!loop) {
      console.error(`AILoopService: Loop ${loopId} not found`);
      return;
    }

    loop.status = 'running';
    loop.startTime = new Date();
    loop.currentStepIndex = 0;
    loop.progress = 0;

    this.broadcastLoopUpdate(loop);
    this.executeStep(loopId, 0);
  }

  async executeStep(loopId: string, stepIndex: number): Promise<void> {
    const loop = this.loops.get(loopId);
    if (!loop || stepIndex >= loop.steps.length) return;

    const step = loop.steps[stepIndex];
    step.status = 'running';
    
    this.broadcastLoopUpdate(loop);
    
    // Simulate step execution
    const stepDelay = 1000 + Math.random() * 2000;
    
    setTimeout(() => {
      const success = Math.random() > 0.15; // 85% success rate
      
      if (success) {
        step.status = 'completed';
        step.result = `Step ${stepIndex + 1} completed successfully`;
        step.duration = stepDelay;
        
        if (stepIndex < loop.steps.length - 1) {
          loop.currentStepIndex = stepIndex + 1;
          loop.progress = ((stepIndex + 1) / loop.totalSteps) * 100;
          this.executeStep(loopId, stepIndex + 1);
        } else {
          this.completeLoop(loopId);
        }
      } else {
        step.status = 'failed';
        step.error = 'Step execution failed';
        
        this.failLoop(loopId, step.error);
      }
      
      this.broadcastLoopUpdate(loop);
    }, stepDelay);
  }

  private completeLoop(loopId: string): void {
    const loop = this.loops.get(loopId);
    if (loop) {
      loop.status = 'completed';
      loop.endTime = new Date();
      loop.currentStepIndex = loop.totalSteps;
      loop.progress = 100;
      loop.confidence = Math.random() * 20 + 80; // 80-100% confidence
      loop.performance.totalDuration = loop.endTime!.getTime() - loop.startTime!.getTime();
      loop.performance.avgStepTime = loop.performance.totalDuration / loop.totalSteps;
      loop.performance.successRate = 100;
      
      this.broadcastLoopUpdate(loop);
    }
  }

  private failLoop(loopId: string, error: string): void {
    const loop = this.loops.get(loopId);
    if (loop) {
      loop.status = 'failed';
      loop.endTime = new Date();
      loop.error = error;
      loop.performance.totalDuration = loop.endTime!.getTime() - loop.startTime!.getTime();
      loop.performance.successRate = (loop.currentStepIndex / loop.totalSteps) * 100;
      
      this.broadcastLoopUpdate(loop);
    }
  }

  private getDefaultSteps(): any[] {
    return [
      {
        id: 'step-1',
        name: 'Audio Capture',
        type: 'search',
        status: 'pending'
      },
      {
        id: 'step-2',
        name: 'Speech-to-Text',
        type: 'search',
        status: 'pending'
      },
      {
        id: 'step-3',
        name: 'AI Processing',
        type: 'search',
        status: 'pending'
      },
      {
        id: 'step-4',
        name: 'Decision Engine',
        type: 'search',
        status: 'pending'
      },
      {
        id: 'step-5',
        name: 'RPA Execution',
        type: 'search',
        status: 'pending'
      }
    ];
  }

  getAllLoops(): any[] {
    return Array.from(this.loops.values());
  }

  getLoop(loopId: string): any | undefined {
    return this.loops.get(loopId);
  }

  getLoopUpdates(): Observable<any> {
    return this.loopUpdates.asObservable();
  }

  private broadcastLoopUpdate(loop: any): void {
    console.log(`AILoopService: Broadcasting update for loop ${loop.id}`);
    this.loopUpdates.next(loop);
  }

  resetLoop(loopId: string): void {
    const loop = this.loops.get(loopId);
    if (loop) {
      loop.status = 'idle';
      loop.startTime = undefined;
      loop.endTime = undefined;
      loop.currentStepIndex = 0;
      loop.progress = 0;
      loop.steps.forEach(step => {
        step.status = 'pending';
        step.result = undefined;
        step.error = undefined;
        step.duration = undefined;
      });
      this.broadcastLoopUpdate(loop);
    }
  }

  pauseLoop(loopId: string): void {
    const loop = this.loops.get(loopId);
    if (loop && loop.status === 'running') {
      loop.status = 'paused';
      this.broadcastLoopUpdate(loop);
      console.log(`AILoopService: Paused loop ${loopId}`);
    }
  }

  deleteLoop(loopId: string): void {
    const deleted = this.loops.delete(loopId);
    if (deleted) {
      console.log(`AILoopService: Deleted loop ${loopId}`);
    }
  }

  initializeDemoLoops(): void {
    const demoLoop = this.createLoop('Demo AI Loop');
    console.log(`AILoopService: Initialized demo loop ${demoLoop.id}`);
  }
}