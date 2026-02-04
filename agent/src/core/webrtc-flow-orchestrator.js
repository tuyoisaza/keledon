/**
 * WebRTC Flow Orchestrator - End-to-End Agent Runtime
 * Coordinates STT, Cloud Brain, TTS, and RPA for seamless WebRTC flow
 */

export class WebRTCFlowOrchestrator {
  constructor(sessionManager, sttManager, ttsManager, rpaExecutor) {
    this.sessionManager = sessionManager;
    this.sttManager = sttManager;
    this.ttsManager = ttsManager;
    this.rpaExecutor = rpaExecutor;
    
    // Flow state management
    this.flowState = 'idle'; // idle | listening | processing | speaking | automating
    this.activeFlow = null;
    this.flowHistory = [];
    
    // Component states for Side Panel
    this.status = {
      webrtc: 'disconnected',
      flow: 'idle',
      session: null
    };
    
    // Configuration
    this.config = {
      autoStart: true,
      interruptSpeech: true,
      enableRPA: true,
      maxFlowHistory: 100,
      ...this.getEnvironmentConfig()
    };
    
    // Performance tracking
    this.stats = {
      flowsCompleted: 0,
      flowsInterrupted: 0,
      totalFlowTime: 0,
      currentFlowStart: null
    };
  }

  /**
   * Get configuration from environment (anti-demo)
   */
  getEnvironmentConfig() {
    return {
      autoStart: process.env.WEBRTC_AUTO_START === 'true',
      interruptSpeech: process.env.WEBRTC_INTERRUPT_SPEECH !== 'false',
      enableRPA: process.env.WEBRTC_ENABLE_RPA !== 'false',
      maxFlowHistory: parseInt(process.env.WEBRTC_MAX_HISTORY) || 100
    };
  }

  /**
   * Initialize WebRTC flow orchestrator
   */
  async initialize() {
    try {
      // Set up event handlers for all components
      this.setupEventHandlers();
      
      // Start session if configured
      if (this.config.autoStart) {
        await this.startFlow();
      }
      
      this.status.webrtc = 'ready';
      this.emit('webrtc:initialized', { config: this.config });
      
    } catch (error) {
      this.status.webrtc = 'error';
      this.emit('webrtc:error', error);
      throw error;
    }
  }

  /**
   * Start end-to-end WebRTC flow
   */
  async startFlow() {
    if (this.flowState !== 'idle') {
      throw new Error('Flow already active');
    }

    const session = this.sessionManager.getCurrentSession();
    if (!session) {
      throw new Error('No active session for WebRTC flow');
    }

    try {
      this.flowState = 'listening';
      this.activeFlow = {
        sessionId: session.id,
        startTime: new Date().toISOString(),
        steps: []
      };
      
      this.stats.currentFlowStart = new Date().toISOString();
      
      this.emit('webrtc:flow_started', {
        sessionId: session.id,
        flowId: this.activeFlow.startTime
      });
      
      // Start STT (Speech-to-Text) - this will trigger text_input events
      await this.sttManager.start();
      
      this.status.flow = 'listening';
      
      // Set up Cloud command handling
      this.setupCloudCommandHandling();
      
      console.log('WebRTC flow started - listening for audio input');
      
    } catch (error) {
      this.flowState = 'error';
      this.emit('webrtc:error', error);
      throw error;
    }
  }

  /**
   * Set up event handlers between components
   */
  setupEventHandlers() {
    // Handle STT events
    this.sttManager.on('stt:text_input_sent', (data) => {
      this.handleTextInput(data);
    });
    
    this.sttManager.on('stt:listening', () => {
      this.flowState = 'listening';
      this.status.flow = 'listening';
      this.emit('webrtc:flow_listening');
    });
    
    this.sttManager.on('stt:stopped', () => {
      if (this.flowState === 'listening') {
        this.flowState = 'idle';
        this.status.flow = 'processing_cloud';
        this.emit('webrtc:flow_processing_cloud');
      }
    });
    
    // Handle TTS events
    this.ttsManager.on('tts:utterance_started', (data) => {
      this.flowState = 'speaking';
      this.status.flow = 'speaking';
      this.emit('webrtc:flow_speaking', { text: data.text });
    });
    
    this.ttsManager.on('tts:utterance_completed', (data) => {
      if (this.flowState === 'speaking') {
        this.flowState = 'idle';
        this.status.flow = 'idle';
        this.emit('webrtc:flow_idle');
      }
    });
    
    // Handle RPA events
    this.rpaExecutor.on('rpa:execution_started', (data) => {
      this.flowState = 'automating';
      this.status.flow = 'automating';
      this.emit('webrtc:flow_automating', {
        executionId: data.executionId,
        stepsCount: data.stepsCount
      });
    });
    
    this.rpaExecutor.on('rpa:step_completed', (data) => {
      if (this.activeFlow) {
        this.activeFlow.steps.push({
          step: data.step,
          result: data.result,
          timestamp: data.timestamp
        });
      }
    });
    
    this.rpaExecutor.on('rpa:execution_completed', (data) => {
      if (this.flowState === 'automating') {
        this.flowState = 'idle';
        this.status.flow = 'idle';
        
        // Record completed flow
        this.recordCompletedFlow(data);
        
        this.emit('webrtc:flow_completed', {
          executionId: data.executionId,
          stepsCount: data.stepsCount,
          results: data.results
        });
      }
    });
    
    this.rpaExecutor.on('rpa:execution_failed', (data) => {
      this.flowState = 'error';
      this.status.flow = 'error';
      this.emit('webrtc:flow_error', { error: data.error });
    });
  }

  /**
   * Handle text input from STT
   */
  handleTextInput(data) {
    if (!this.activeFlow) return;
    
    try {
      // Record text input in flow
      this.activeFlow.steps.push({
        type: 'text_input',
        data: data,
        timestamp: new Date().toISOString()
      });
      
      this.emit('webrtc:text_input_received', {
        text: data.text,
        sessionId: this.activeFlow.sessionId
      });
      
    } catch (error) {
      this.emit('webrtc:error', error);
    }
  }

  /**
   * Set up Cloud command handling
   */
  setupCloudCommandHandling() {
    // This connects to existing WebSocket client command handling
    // Cloud 'say' commands go to TTS, 'ui_steps' go to RPA
    // The existing WebSocket client already handles this routing
  }

  /**
   * Stop current flow
   */
  async stopFlow() {
    if (this.flowState === 'idle') {
      return { success: false, message: 'No active flow to stop' };
    }

    try {
      // Stop STT
      await this.sttManager.stop();
      
      // Stop any active TTS
      if (this.ttsManager.getStatus().isSpeaking) {
        await this.ttsManager.stopSpeech();
      }
      
      // Stop any active RPA
      if (this.rpaExecutor.getStatus().isExecuting) {
        await this.rpaExecutor.pauseExecution();
      }
      
      // Record stopped flow
      if (this.activeFlow) {
        this.activeFlow.endTime = new Date().toISOString();
        this.recordInterruptedFlow();
      }
      
      this.flowState = 'idle';
      this.status.flow = 'idle';
      
      this.emit('webrtc:flow_stopped', {
        flowId: this.activeFlow?.startTime
      });
      
      return { success: true };
      
    } catch (error) {
      this.flowState = 'error';
      this.emit('webrtc:error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record completed flow
   */
  recordCompletedFlow(flowData) {
    const endTime = new Date();
    const duration = endTime.getTime() - new Date(this.activeFlow.startTime).getTime();
    
    this.stats.flowsCompleted++;
    this.stats.totalFlowTime += duration;
    
    // Add to history
    this.flowHistory.push({
      sessionId: this.activeFlow.sessionId,
      startTime: this.activeFlow.startTime,
      endTime: endTime.toISOString(),
      duration,
      steps: this.activeFlow.steps,
      status: 'completed'
    });
    
    // Trim history if needed
    if (this.flowHistory.length > this.config.maxFlowHistory) {
      this.flowHistory = this.flowHistory.slice(-this.config.maxFlowHistory);
    }
    
    this.activeFlow = null;
    
    this.emit('webrtc:flow_recorded', {
      sessionId: flowData.executionId,
      duration,
      stepsCount: flowData.stepsCount
    });
  }

  /**
   * Record interrupted flow
   */
  recordInterruptedFlow() {
    if (this.activeFlow) {
      this.activeFlow.endTime = new Date().toISOString();
      this.activeFlow.status = 'interrupted';
      
      this.stats.flowsInterrupted++;
      
      // Add to history
      this.flowHistory.push({
        sessionId: this.activeFlow.sessionId,
        startTime: this.activeFlow.startTime,
        endTime: this.activeFlow.endTime,
        status: 'interrupted',
        steps: this.activeFlow.steps
      });
      
      // Trim history if needed
      if (this.flowHistory.length > this.config.maxFlowHistory) {
        this.flowHistory = this.flowHistory.slice(-this.config.maxFlowHistory);
      }
    }
    
    this.activeFlow = null;
  }

  /**
   * Get complete flow status
   */
  getStatus() {
    const componentStatuses = {
      stt: this.sttManager.getStatus().status,
      tts: this.ttsManager.getStatus().status,
      rpa: this.rpaExecutor.getStatus().status
    };
    
    return {
      flowState: this.flowState,
      activeFlow: this.activeFlow,
      componentStatuses,
      config: this.config,
      stats: { ...this.stats },
      flowHistory: this.flowHistory.slice(-10), // Last 10 flows
      webrtcStatus: this.status.webrtc
    };
  }

  /**
   * Get flow history
   */
  getFlowHistory(limit = 50) {
    return this.flowHistory.slice(-limit);
  }

  /**
   * Configure flow settings
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    this.emit('webrtc:config_updated', {
      oldConfig: this.config,
      newConfig: this.config
    });
  }

  /**
   * Test WebRTC flow components
   */
  async test() {
    console.log('🧪 Testing WebRTC Flow Orchestrator...');
    
    try {
      const session = await this.sessionManager.createSession();
      console.log('✅ Test session created:', session.id);
      
      // Test flow start
      await this.startFlow();
      console.log('✅ Flow started successfully');
      
      // Test flow stop
      const stopResult = await this.stopFlow();
      console.log('✅ Flow stopped successfully');
      
      // Test status
      const status = this.getStatus();
      console.log('✅ Flow status:', status);
      
      this.emit('webrtc:test_complete', { session, status });
      return true;
      
    } catch (error) {
      console.error('❌ WebRTC flow test failed:', error);
      this.emit('webrtc:test_failed', { error: error.message });
      return false;
    }
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this.eventHandlers) {
      this.eventHandlers = new Map();
    }
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    if (!this.eventHandlers || !this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in WebRTC flow orchestrator event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      // Stop active flow
      await this.stopFlow();
      
      // Cleanup components
      await this.sttManager.cleanup();
      await this.ttsManager.cleanup();
      await this.rpaExecutor.cleanup();
      
      this.flowState = 'idle';
      this.activeFlow = null;
      this.status.webrtc = 'disconnected';
      
      if (this.eventHandlers) {
        this.eventHandlers.clear();
      }
      
      console.log('WebRTC flow orchestrator cleaned up');
      
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}