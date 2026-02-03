/**
 * End-to-End Flow Integration Manager
 * Orchestrates complete WebRTC flow: STT → Cloud → TTS → RPA
 */

import { WebRTCManager } from './webrtc-manager.js';

export class FlowIntegrationManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.webrtcManager = null;
    this.currentFlowId = null;
    this.currentRunId = null;
    this.flowActive = false;
    this.flowStartTime = null;
    this.currentStep = null;
    
    // Flow configuration
    this.flowConfig = {
      steps: [
        'audio_capture',
        'speech_to_text', 
        'cloud_decision',
        'text_to_speech',
        'ui_automation',
        'result_reporting'
      ],
      timeoutMs: 300000, // 5 minutes max
      retryAttempts: 3
    };
    
    this.setupEventHandlers();
    this.initializeComponents();
    console.log('FlowIntegrationManager: Initialized for end-to-end flow orchestration');
  }

  setupEventHandlers() {
    // Handle flow start
    this.eventBus.on('flow:start', async (flowData) => {
      await this.startFlow(flowData);
    });

    // Handle STT results
    this.eventBus.on('stt:text-result', (textData) => {
      this.handleSTTResult(textData);
    });

    // Handle cloud commands
    this.eventBus.on('command:received', (command) => {
      this.handleCloudCommand(command);
    });

    // Handle RPA results
    this.eventBus.on('rpa:step-complete', (result) => {
      this.handleRPAStepComplete(result);
    });

    // Handle flow control
    this.eventBus.on('flow:pause', () => {
      this.pauseFlow();
    });

    this.eventBus.on('flow:resume', () => {
      this.resumeFlow();
    });

    this.eventBus.on('flow:stop', () => {
      this.stopFlow();
    });
  }

  initializeComponents() {
    // Initialize WebRTC Manager
    this.webrtcManager = new WebRTCManager(this.eventBus);
    
    console.log('FlowIntegrationManager: Components initialized');
  }

  /**
   * Start complete end-to-end flow
   */
  async startFlow(flowData = {}) {
    try {
      console.log('FlowIntegrationManager: Starting end-to-end flow');
      
      this.currentFlowId = flowData.flowId || 'keledon-v1-flow';
      this.currentRunId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.flowActive = true;
      this.flowStartTime = new Date();
      this.currentStep = 'audio_capture';

      // Initialize WebRTC for call
      await this.webrtcManager.initializeWebRTC();
      
      // Emit flow start event
      this.eventBus.emit('flow:started', {
        flowId: this.currentFlowId,
        runId: this.currentRunId,
        startTime: this.flowStartTime.toISOString(),
        currentStep: this.currentStep
      });

      // Start STT processing
      this.eventBus.emit('webrtc:start-capture');
      
      console.log(`FlowIntegrationManager: Flow ${this.currentFlowId} started with run ${this.currentRunId}`);

    } catch (error) {
      console.error('FlowIntegrationManager: Failed to start flow', error);
      this.emitFlowError('Failed to start flow', error);
      throw error;
    }
  }

  /**
   * Handle STT text result
   */
  handleSTTResult(textData) {
    if (!this.flowActive) return;

    try {
      console.log(`FlowIntegrationManager: STT result received: "${textData.text}"`);
      
      this.currentStep = 'speech_to_text';
      
      // Send text_input event to cloud
      this.eventBus.emit('agent:send-event', {
        session_id: textData.sessionId,
        event_type: 'text_input',
        payload: {
          text: textData.text,
          confidence: textData.confidence || 0.9,
          provider: textData.provider || 'webbrtc'
        },
        ts: new Date().toISOString(),
        agent_id: textData.agentId
      });

      this.updateFlowStatus('stt_processed', {
        text: textData.text,
        confidence: textData.confidence
      });

    } catch (error) {
      console.error('FlowIntegrationManager: Failed to handle STT result', error);
      this.emitFlowError('Failed to process STT result', error);
    }
  }

  /**
   * Handle cloud command
   */
  handleCloudCommand(command) {
    if (!this.flowActive) return;

    try {
      console.log('FlowIntegrationManager: Cloud command received', command);
      
      if (command.say) {
        this.currentStep = 'text_to_speech';
        
        // Forward to TTS system
        this.eventBus.emit('tts:speak', command.say);
        
        this.updateFlowStatus('tts_initiated', {
          command: 'say',
          text: command.say.text,
          interruptible: command.say.interruptible
        });
      }
      
      if (command.ui_steps && command.ui_steps.length > 0) {
        this.currentStep = 'ui_automation';
        
        // Forward to RPA system
        this.eventBus.emit('rpa:execute-steps', {
          steps: command.ui_steps,
          flowId: command.flow_id,
          runId: command.flow_run_id
        });
        
        this.updateFlowStatus('rpa_initiated', {
          steps: command.ui_steps,
          stepCount: command.ui_steps.length
        });
      }

    } catch (error) {
      console.error('FlowIntegrationManager: Failed to handle cloud command', error);
      this.emitFlowError('Failed to process cloud command', error);
    }
  }

  /**
   * Handle RPA step completion
   */
  handleRPAStepComplete(result) {
    if (!this.flowActive) return;

    try {
      console.log('FlowIntegrationManager: RPA step completed', result);
      
      this.currentStep = 'result_reporting';
      
      // Send ui_result event to cloud
      this.eventBus.emit('agent:send-event', {
        session_id: result.sessionId,
        event_type: 'ui_result',
        payload: {
          step_id: result.stepId,
          success: result.success,
          duration_ms: result.duration,
          result: result.result,
          error: result.error || null
        },
        ts: new Date().toISOString(),
        agent_id: result.agentId
      });

      this.updateFlowStatus('rpa_completed', {
        stepId: result.stepId,
        success: result.success,
        duration: result.duration
      });

      // Check if flow is complete
      if (result.isLastStep) {
        this.completeFlow();
      }

    } catch (error) {
      console.error('FlowIntegrationManager: Failed to handle RPA result', error);
      this.emitFlowError('Failed to process RPA result', error);
    }
  }

  /**
   * Pause flow
   */
  pauseFlow() {
    if (!this.flowActive) return;

    try {
      console.log('FlowIntegrationManager: Pausing flow');
      
      this.eventBus.emit('flow:paused', {
        flowId: this.currentFlowId,
        runId: this.currentRunId,
        currentStep: this.currentStep,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('FlowIntegrationManager: Failed to pause flow', error);
    }
  }

  /**
   * Resume flow
   */
  resumeFlow() {
    if (!this.flowActive) return;

    try {
      console.log('FlowIntegrationManager: Resuming flow');
      
      this.eventBus.emit('flow:resumed', {
        flowId: this.currentFlowId,
        runId: this.currentRunId,
        currentStep: this.currentStep,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('FlowIntegrationManager: Failed to resume flow', error);
    }
  }

  /**
   * Stop flow
   */
  stopFlow() {
    if (!this.flowActive) return;

    try {
      console.log('FlowIntegrationManager: Stopping flow');
      
      this.flowActive = false;
      this.currentStep = null;
      
      // Stop all components
      this.eventBus.emit('tts:stop');
      this.eventBus.emit('rpa:stop');
      this.eventBus.emit('webrtc:end-call');
      
      this.eventBus.emit('flow:stopped', {
        flowId: this.currentFlowId,
        runId: this.currentRunId,
        finalStep: this.currentStep,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('FlowIntegrationManager: Failed to stop flow', error);
    }
  }

  /**
   * Complete flow successfully
   */
  completeFlow() {
    try {
      console.log('FlowIntegrationManager: Flow completed successfully');
      
      const flowDuration = this.flowStartTime ? 
        Date.now() - this.flowStartTime.getTime() : 0;
      
      this.flowActive = false;
      this.currentStep = 'completed';
      
      this.eventBus.emit('flow:completed', {
        flowId: this.currentFlowId,
        runId: this.currentRunId,
        duration: flowDuration,
        stepsCompleted: this.flowConfig.steps.length,
        success: true,
        timestamp: new Date().toISOString()
      });

      // Report success to cloud
      this.eventBus.emit('agent:send-event', {
        session_id: this.getSessionId(),
        event_type: 'system',
        payload: {
          type: 'flow_completed',
          flow_id: this.currentFlowId,
          flow_run_id: this.currentRunId,
          duration_ms: flowDuration,
          success: true
        },
        ts: new Date().toISOString(),
        agent_id: this.getAgentId()
      });

    } catch (error) {
      console.error('FlowIntegrationManager: Failed to complete flow', error);
      this.emitFlowError('Failed to complete flow', error);
    }
  }

  /**
   * Update flow status
   */
  updateFlowStatus(status, details = {}) {
    this.eventBus.emit('flow:status-update', {
      flowId: this.currentFlowId,
      runId: this.currentRunId,
      currentStep: this.currentStep,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit flow error
   */
  emitFlowError(message, error) {
    this.eventBus.emit('flow:error', {
      flowId: this.currentFlowId,
      runId: this.currentRunId,
      error: {
        message,
        details: error.message || error.toString()
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get session ID (placeholder - should come from session manager)
   */
  getSessionId() {
    // This should come from the session manager
    return 'session_' + Date.now();
  }

  /**
   * Get agent ID (placeholder - should come from config)
   */
  getAgentId() {
    return 'agent-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get current flow status
   */
  getFlowStatus() {
    return {
      flowId: this.currentFlowId,
      runId: this.currentRunId,
      isActive: this.flowActive,
      currentStep: this.currentStep,
      startTime: this.flowStartTime?.toISOString() || null,
      duration: this.flowStartTime ? Date.now() - this.flowStartTime.getTime() : 0,
      config: this.flowConfig
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('FlowIntegrationManager: Cleaning up resources');
    
    // Stop flow
    this.stopFlow();
    
    // Cleanup components
    if (this.webrtcManager) {
      await this.webrtcManager.cleanup();
    }
    
    this.flowActive = false;
    this.currentStep = null;
    this.currentFlowId = null;
    this.currentRunId = null;
    this.flowStartTime = null;
  }
}