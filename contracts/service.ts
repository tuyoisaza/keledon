/**
 * Validation Service for KELEDON Contracts
 * 
 * This service provides runtime validation for all contract types and integrates
 * with the application lifecycle for proper initialization and error handling.
 */

import {
  ValidationResult,
  ValidationError,
  validateBrainEvent,
  validateBrainCommand,
  validateRealtimeMessage,
  validateTextInput,
  validateSpeakCommand,
  validateRPAStep,
  validateRPAResult,
  initializeValidators,
  formatValidationErrors,
  formatValidationErrorsForLogging,
  clearValidationCache,
  isBrainEventValid,
  isBrainCommandValid,
  isRealtimeMessageValid
} from './validation';
import {
  BrainEvent,
  BrainCommand,
  RealtimeMessage,
  TextInput,
  SpeakCommand,
  RPAStep,
  RPAResult
} from './types';

export interface ValidationServiceConfig {
  enableCaching?: boolean;
  maxCacheSize?: number;
  logErrors?: boolean;
  throwOnValidationError?: boolean;
}

export class ValidationService {
  private config: ValidationServiceConfig;
  private initialized = false;
  private validationStats = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    cacheHits: 0,
    errorsByType: new Map<string, number>()
  };

  constructor(config: ValidationServiceConfig = {}) {
    this.config = {
      enableCaching: true,
      maxCacheSize: 1000,
      logErrors: true,
      throwOnValidationError: false,
      ...config
    };
  }

  /**
   * Initialize the validation service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      initializeValidators();
      this.initialized = true;
      
      if (this.config.logErrors) {
        console.log('Validation service initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize validation service:', error);
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Validate Brain Event with enhanced error handling
   */
  validateBrainEvent(data: unknown, context?: string): ValidationResult {
    return this.executeValidation(
      () => validateBrainEvent(data),
      'BrainEvent',
      context
    );
  }

  /**
   * Validate Brain Command with enhanced error handling
   */
  validateBrainCommand(data: unknown, context?: string): ValidationResult {
    return this.executeValidation(
      () => validateBrainCommand(data),
      'BrainCommand',
      context
    );
  }

  /**
   * Validate Realtime Message with enhanced error handling
   */
  validateRealtimeMessage(data: unknown, context?: string): ValidationResult {
    return this.executeValidation(
      () => validateRealtimeMessage(data),
      'RealtimeMessage',
      context
    );
  }

  /**
   * Validate Text Input with enhanced error handling
   */
  validateTextInput(data: unknown, context?: string): ValidationResult {
    return this.executeValidation(
      () => validateTextInput(data),
      'TextInput',
      context
    );
  }

  /**
   * Validate Speak Command with enhanced error handling
   */
  validateSpeakCommand(data: unknown, context?: string): ValidationResult {
    return this.executeValidation(
      () => validateSpeakCommand(data),
      'SpeakCommand',
      context
    );
  }

  /**
   * Validate RPA Step with enhanced error handling
   */
  validateRPAStep(data: unknown, context?: string): ValidationResult {
    return this.executeValidation(
      () => validateRPAStep(data),
      'RPAStep',
      context
    );
  }

  /**
   * Validate RPA Result with enhanced error handling
   */
  validateRPAResult(data: unknown, context?: string): ValidationResult {
    return this.executeValidation(
      () => validateRPAResult(data),
      'RPAResult',
      context
    );
  }

  /**
   * Type guard helpers with context
   */
  isBrainEvent(data: unknown, context?: string): data is BrainEvent {
    const result = this.validateBrainEvent(data, context);
    return result.valid;
  }

  isBrainCommand(data: unknown, context?: string): data is BrainCommand {
    const result = this.validateBrainCommand(data, context);
    return result.valid;
  }

  isRealtimeMessage(data: unknown, context?: string): data is RealtimeMessage {
    const result = this.validateRealtimeMessage(data, context);
    return result.valid;
  }

  /**
   * Validate and return typed data (throws if invalid)
   */
  assertBrainEvent(data: unknown, context?: string): BrainEvent {
    const result = this.validateBrainEvent(data, context);
    if (!result.valid) {
      const error = new Error(`Invalid BrainEvent${context ? ` (${context})` : ''}: ${formatValidationErrors(result.errors).join(', ')}`);
      (error as any).validationErrors = result.errors;
      throw error;
    }
    return result.data as BrainEvent;
  }

  assertBrainCommand(data: unknown, context?: string): BrainCommand {
    const result = this.validateBrainCommand(data, context);
    if (!result.valid) {
      const error = new Error(`Invalid BrainCommand${context ? ` (${context})` : ''}: ${formatValidationErrors(result.errors).join(', ')}`);
      (error as any).validationErrors = result.errors;
      throw error;
    }
    return result.data as BrainCommand;
  }

  assertRealtimeMessage(data: unknown, context?: string): RealtimeMessage {
    const result = this.validateRealtimeMessage(data, context);
    if (!result.valid) {
      const error = new Error(`Invalid RealtimeMessage${context ? ` (${context})` : ''}: ${formatValidationErrors(result.errors).join(', ')}`);
      (error as any).validationErrors = result.errors;
      throw error;
    }
    return result.data as RealtimeMessage;
  }

  /**
   * Get validation statistics
   */
  getStats() {
    return {
      ...this.validationStats,
      successRate: this.validationStats.totalValidations > 0 
        ? (this.validationStats.successfulValidations / this.validationStats.totalValidations) * 100 
        : 0,
      cacheHitRate: this.validationStats.totalValidations > 0 
        ? (this.validationStats.cacheHits / this.validationStats.totalValidations) * 100 
        : 0
    };
  }

  /**
   * Reset validation statistics
   */
  resetStats(): void {
    this.validationStats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      cacheHits: 0,
      errorsByType: new Map()
    };
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    clearValidationCache();
  }

  /**
   * Health check for the validation service
   */
  healthCheck(): {
    status: 'healthy' | 'unhealthy';
    initialized: boolean;
    stats: any;
    timestamp: string;
  } {
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      initialized: this.initialized,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Internal method to execute validation with error handling and stats
   */
  private executeValidation(
    validator: () => ValidationResult,
    typeName: string,
    context?: string
  ): ValidationResult {
    this.validationStats.totalValidations++;

    try {
      const result = validator();

      if (result.valid) {
        this.validationStats.successfulValidations++;
      } else {
        this.validationStats.failedValidations++;
        
        // Track errors by type
        const errorCount = this.validationStats.errorsByType.get(typeName) || 0;
        this.validationStats.errorsByType.set(typeName, errorCount + 1);

        // Log errors if enabled
        if (this.config.logErrors) {
          console.error(`Validation failed for ${typeName}${context ? ` (${context})` : ''}:`, {
            errors: result.errors,
            data: result.data
          });
        }

        // Throw if configured
        if (this.config.throwOnValidationError) {
          throw new Error(`${typeName} validation failed: ${formatValidationErrors(result.errors).join(', ')}`);
        }
      }

      return result;
    } catch (error) {
      this.validationStats.failedValidations++;
      
      if (this.config.logErrors) {
        console.error(`Validation error for ${typeName}${context ? ` (${context})` : ''}:`, error);
      }

      if (this.config.throwOnValidationError) {
        throw error;
      }

      return {
        valid: false,
        errors: [{
          field: 'root',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          value: null,
          schemaPath: ''
        }]
      };
    }
  }
}

// Create a default validation service instance
export const validationService = new ValidationService();

// Export factory function for creating configured instances
export function createValidationService(config?: ValidationServiceConfig): ValidationService {
  return new ValidationService(config);
}

// Export convenience functions that use the default service
export async function initializeValidationService(config?: ValidationServiceConfig): Promise<ValidationService> {
  if (config) {
    const service = new ValidationService(config);
    await service.initialize();
    return service;
  } else {
    await validationService.initialize();
    return validationService;
  }
}