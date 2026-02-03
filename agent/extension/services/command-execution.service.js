import { Injectable, Logger, EventEmitter } from '@nestjs/common';

// TTS Provider interface
interface TTSProvider {
  name: string;
  initialize(config: any): Promise<void>;
  speak(text: string, options?: any): Promise<void>;
  stop(): Promise<void>;
  isSpeaking(): boolean;
  cleanup(): Promise<void>;
}

// Local TTS implementation (using Web Speech API)
class LocalTTSProvider implements TTSProvider {
  name = 'local';
  private synthesis: SpeechSynthesis;
  private utterance: SpeechSynthesisUtterance | null = null;
  private isInitialized = false;

  async initialize(config: any): Promise<void> {
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech synthesis not supported');
    }

    this.synthesis = window.speechSynthesis;
    this.isInitialized = true;
    console.log('LocalTTS: Initialized');
  }

  async speak(text: string, options: any = {}): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('TTS not initialized');
    }

    // Stop any current speech
    this.stop();

    this.utterance = new SpeechSynthesisUtterance(text);
    
    // Configure utterance
    this.utterance.lang = options.language || 'en-US';
    this.utterance.rate = options.rate || 1.0;
    this.utterance.pitch = options.pitch || 1.0;
    this.utterance.volume = options.volume || 1.0;
    this.utterance.voice = this.selectVoice(options.voice);

    // Handle events
    this.utterance.onstart = () => {
      console.log('LocalTTS: Started speaking');
    };

    this.utterance.onend = () => {
      console.log('LocalTTS: Finished speaking');
      this.utterance = null;
    };

    this.utterance.onerror = (event) => {
      console.error('LocalTTS: Speech error:', event);
      this.utterance = null;
    };

    // Start speaking
    this.synthesis.speak(this.utterance);
  }

  async stop(): Promise<void> {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.utterance = null;
  }

  isSpeaking(): boolean {
    return this.synthesis ? this.synthesis.speaking : false;
  }

  private selectVoice(voiceName?: string): SpeechSynthesisVoice | null {
    const voices = this.synthesis.getVoices();
    
    if (voiceName) {
      return voices.find(voice => voice.name === voiceName) || null;
    }

    // Default to first English voice
    return voices.find(voice => voice.lang.startsWith('en')) || voices[0] || null;
  }

  async cleanup(): Promise<void> {
    await this.stop();
    this.isInitialized = false;
  }
}

@Injectable()
export class CommandExecutionService {
  private readonly logger = new Logger(CommandExecutionService.name);
  private ttsProvider: TTSProvider;
  private isInitialized = false;

  constructor() {
    this.logger.log('CommandExecutionService: Initialized');
  }

  /**
   * Initialize command execution service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize TTS provider
      this.ttsProvider = new LocalTTSProvider();
      await this.ttsProvider.initialize({
        language: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
      });

      this.isInitialized = true;
      this.logger.log('CommandExecutionService: Ready for command execution');

    } catch (error) {
      this.logger.error('CommandExecutionService: Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Execute "say" command
   */
  async executeSayCommand(command: any): Promise<void> {
    this.logger.log(`Executing say command: "${command.payload.text}"`);

    if (!this.isInitialized) {
      throw new Error('Command execution service not initialized');
    }

    try {
      await this.ttsProvider.speak(command.payload.text, {
        language: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        interruptible: command.payload.interruptible,
        ...command.payload.metadata
      });

      this.logger.log(`Say command executed successfully`);

    } catch (error) {
      this.logger.error('Failed to execute say command:', error);
      throw error;
    }
  }

  /**
   * Execute "ui_steps" command
   */
  async executeUIStepsCommand(command: any): Promise<void> {
    this.logger.log(`Executing UI steps command: ${command.payload.steps.length} steps`);

    if (!this.isInitialized) {
      throw new Error('Command execution service not initialized');
    }

    try {
      // For now, just acknowledge the UI steps
      // In production, this would execute real RPA steps
      for (const step of command.payload.steps) {
        this.logger.log(`Executing step: ${step.step_id} - ${step.action} on ${step.selector}`);
        
        // Simulate step execution time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // TODO: Send back ui_result event for each step
        // This would be handled by the RPA system
      }

      this.logger.log(`UI steps command executed successfully`);

    } catch (error) {
      this.logger.error('Failed to execute UI steps command:', error);
      throw error;
    }
  }

  /**
   * Execute "mode" command
   */
  async executeModeCommand(command: any): Promise<void> {
    this.logger.log(`Executing mode command: ${command.payload.mode}`);

    if (!this.isInitialized) {
      throw new Error('Command execution service not initialized');
    }

    try {
      // For now, just log the mode change
      // In production, this would update the agent's operating mode
      const modeText = {
        normal: 'Switched to normal mode',
        safe: 'Switched to safe mode',
        silent: 'Switched to silent mode'
      };

      await this.ttsProvider.speak(modeText[command.payload.mode] || `Mode changed to ${command.payload.mode}`);

      this.logger.log(`Mode command executed successfully: ${command.payload.mode}`);

    } catch (error) {
      this.logger.error('Failed to execute mode command:', error);
      throw error;
    }
  }

  /**
   * Execute "stop" command
   */
  async executeStopCommand(command: any): Promise<void> {
    this.logger.log(`Executing stop command: ${command.payload.reason || 'No reason provided'}`);

    if (!this.isInitialized) {
      throw new Error('Command execution service not initialized');
    }

    try {
      // Stop any current TTS
      await this.ttsProvider.stop();

      // Announce stop if graceful
      if (command.payload.graceful !== false) {
        await this.ttsProvider.speak('Stopping current operations');
      }

      this.logger.log(`Stop command executed successfully`);

    } catch (error) {
      this.logger.error('Failed to execute stop command:', error);
      throw error;
    }
  }

  /**
   * Execute any command based on type
   */
  async executeCommand(command: any): Promise<void> {
    this.logger.log(`Executing command: ${command.type}`);

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      switch (command.type) {
        case 'say':
          await this.executeSayCommand(command);
          break;
        case 'ui_steps':
          await this.executeUIStepsCommand(command);
          break;
        case 'mode':
          await this.executeModeCommand(command);
          break;
        case 'stop':
          await this.executeStopCommand(command);
          break;
        default:
          throw new Error(`Unknown command type: ${command.type}`);
      }

    } catch (error) {
      this.logger.error(`Failed to execute command ${command.type}:`, error);
      throw error;
    }
  }

  /**
   * Check if currently executing anything
   */
  isExecuting(): boolean {
    return this.ttsProvider ? this.ttsProvider.isSpeaking() : false;
  }

  /**
   * Get current execution status
   */
  getStatus(): any {
    return {
      initialized: this.isInitialized,
      executing: this.isExecuting(),
      tts_provider: this.ttsProvider ? this.ttsProvider.name : null,
      capabilities: [
        'say',
        'ui_steps',
        'mode', 
        'stop'
      ]
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.ttsProvider) {
        await this.ttsProvider.cleanup();
        this.ttsProvider = null;
      }

      this.isInitialized = false;
      this.logger.log('CommandExecutionService: Cleaned up');

    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }
}