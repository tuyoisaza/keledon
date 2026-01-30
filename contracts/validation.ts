/**
 * Validation utilities for KELEDON contracts v1
 * Provides runtime validation for all contract types
 */

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import {
  BrainEvent,
  BrainCommand,
  RealtimeMessage,
  TextInput,
  SpeakCommand,
  RPAStep,
  RPAResult,
  UUID,
  ISODateTime
} from './types';

// ============================================================================
// JSON Schema Imports
// ============================================================================

import brainEventSchema from './v1/brain/event.schema.json';
import brainCommandSchema from './v1/brain/command.schema.json';
import realtimeSchema from './v1/ws/realtime.schema.json';
import textInputSchema from './v1/audio/text_input.schema.json';
import speakSchema from './v1/audio/speak.schema.json';
import rpaStepSchema from './v1/rpa/step.schema.json';
import rpaResultSchema from './v1/rpa/result.schema.json';

// ============================================================================
// AJV Validator Setup
// ============================================================================

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
  allowUnionTypes: true
});

addFormats(ajv);

// ============================================================================
// Compiled Validators
// ============================================================================

let brainEventValidator: ValidateFunction | null = null;
let brainCommandValidator: ValidateFunction | null = null;
let realtimeMessageValidator: ValidateFunction | null = null;
let textInputValidator: ValidateFunction | null = null;
let speakCommandValidator: ValidateFunction | null = null;
let rpaStepValidator: ValidateFunction | null = null;
let rpaResultValidator: ValidateFunction | null = null;

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
  schemaPath: string;
}

/**
 * Initialize all validators (call once at startup)
 */
export function initializeValidators(): void {
  try {
    brainEventValidator = ajv.compile(brainEventSchema as any);
    brainCommandValidator = ajv.compile(brainCommandSchema as any);
    realtimeMessageValidator = ajv.compile(realtimeSchema as any);
    textInputValidator = ajv.compile(textInputSchema as any);
    speakCommandValidator = ajv.compile(speakSchema as any);
    rpaStepValidator = ajv.compile(rpaStepSchema as any);
    rpaResultValidator = ajv.compile(rpaResultSchema as any);
  } catch (error) {
    console.error('Failed to initialize validators:', error);
    throw new Error('Validator initialization failed');
  }
}

/**
 * Validate Brain Event (Agent → Cloud)
 */
export function validateBrainEvent(data: unknown): ValidationResult {
  if (!brainEventValidator) {
    throw new Error('Validators not initialized. Call initializeValidators() first.');
  }

  const valid = brainEventValidator(data);
  const errors: ValidationError[] = [];

  if (!valid && brainEventValidator.errors) {
    for (const error of brainEventValidator.errors) {
      errors.push({
        field: error.instancePath || error.schemaPath || 'root',
        message: error.message || 'Validation failed',
        value: error.data,
        schemaPath: error.schemaPath
      });
    }
  }

  return {
    valid: !!valid,
    errors,
    data: valid ? data : undefined
  };
}

/**
 * Validate Brain Command (Cloud → Agent)
 */
export function validateBrainCommand(data: unknown): ValidationResult {
  if (!brainCommandValidator) {
    throw new Error('Validators not initialized. Call initializeValidators() first.');
  }

  const valid = brainCommandValidator(data);
  const errors: ValidationError[] = [];

  if (!valid && brainCommandValidator.errors) {
    for (const error of brainCommandValidator.errors) {
      errors.push({
        field: error.instancePath || error.schemaPath || 'root',
        message: error.message || 'Validation failed',
        value: error.data,
        schemaPath: error.schemaPath
      });
    }
  }

  return {
    valid: !!valid,
    errors,
    data: valid ? data : undefined
  };
}

/**
 * Validate Realtime WebSocket Message
 */
export function validateRealtimeMessage(data: unknown): ValidationResult {
  if (!realtimeMessageValidator) {
    throw new Error('Validators not initialized. Call initializeValidators() first.');
  }

  const valid = realtimeMessageValidator(data);
  const errors: ValidationError[] = [];

  if (!valid && realtimeMessageValidator.errors) {
    for (const error of realtimeMessageValidator.errors) {
      errors.push({
        field: error.instancePath || error.schemaPath || 'root',
        message: error.message || 'Validation failed',
        value: error.data,
        schemaPath: error.schemaPath
      });
    }
  }

  return {
    valid: !!valid,
    errors,
    data: valid ? data : undefined
  };
}

/**
 * Validate Text Input (STT Output)
 */
export function validateTextInput(data: unknown): ValidationResult {
  if (!textInputValidator) {
    throw new Error('Validators not initialized. Call initializeValidators() first.');
  }

  const valid = textInputValidator(data);
  const errors: ValidationError[] = [];

  if (!valid && textInputValidator.errors) {
    for (const error of textInputValidator.errors) {
      errors.push({
        field: error.instancePath || error.schemaPath || 'root',
        message: error.message || 'Validation failed',
        value: error.data,
        schemaPath: error.schemaPath
      });
    }
  }

  return {
    valid: !!valid,
    errors,
    data: valid ? data : undefined
  };
}

/**
 * Validate Speak Command (TTS Input)
 */
export function validateSpeakCommand(data: unknown): ValidationResult {
  if (!speakCommandValidator) {
    throw new Error('Validators not initialized. Call initializeValidators() first.');
  }

  const valid = speakCommandValidator(data);
  const errors: ValidationError[] = [];

  if (!valid && speakCommandValidator.errors) {
    for (const error of speakCommandValidator.errors) {
      errors.push({
        field: error.instancePath || error.schemaPath || 'root',
        message: error.message || 'Validation failed',
        value: error.data,
        schemaPath: error.schemaPath
      });
    }
  }

  return {
    valid: !!valid,
    errors,
    data: valid ? data : undefined
  };
}

/**
 * Validate RPA Step
 */
export function validateRPAStep(data: unknown): ValidationResult {
  if (!rpaStepValidator) {
    throw new Error('Validators not initialized. Call initializeValidators() first.');
  }

  const valid = rpaStepValidator(data);
  const errors: ValidationError[] = [];

  if (!valid && rpaStepValidator.errors) {
    for (const error of rpaStepValidator.errors) {
      errors.push({
        field: error.instancePath || error.schemaPath || 'root',
        message: error.message || 'Validation failed',
        value: error.data,
        schemaPath: error.schemaPath
      });
    }
  }

  return {
    valid: !!valid,
    errors,
    data: valid ? data : undefined
  };
}

/**
 * Validate RPA Result
 */
export function validateRPAResult(data: unknown): ValidationResult {
  if (!rpaResultValidator) {
    throw new Error('Validators not initialized. Call initializeValidators() first.');
  }

  const valid = rpaResultValidator(data);
  const errors: ValidationError[] = [];

  if (!valid && rpaResultValidator.errors) {
    for (const error of rpaResultValidator.errors) {
      errors.push({
        field: error.instancePath || error.schemaPath || 'root',
        message: error.message || 'Validation failed',
        value: error.data,
        schemaPath: error.schemaPath
      });
    }
  }

  return {
    valid: !!valid,
    errors,
    data: valid ? data : undefined
  };
}

// ============================================================================
// Custom Validation Utilities
// ============================================================================

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: unknown): uuid is UUID {
  if (typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate ISO 8601 date-time format
 */
export function isValidISODateTime(datetime: unknown): datetime is ISODateTime {
  if (typeof datetime !== 'string') return false;
  const date = new Date(datetime);
  return !isNaN(date.getTime()) && datetime === date.toISOString();
}

/**
 * Validate confidence score (0-1)
 */
export function isValidConfidence(confidence: unknown): confidence is number {
  return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
}

/**
 * Validate timeout in milliseconds (>= 0)
 */
export function isValidTimeout(timeout: unknown): timeout is number {
  return typeof timeout === 'number' && timeout >= 0;
}

/**
 * Validate audio sample rate
 */
export function isValidSampleRate(sampleRate: unknown): sampleRate is number {
  return typeof sampleRate === 'number' && [8000, 16000, 22050, 44100, 48000].includes(sampleRate);
}

/**
 * Validate audio channels (1 or 2)
 */
export function isValidChannels(channels: unknown): channels is number {
  return typeof channels === 'number' && [1, 2].includes(channels);
}

// ============================================================================
// Validation Middleware Factories
// ============================================================================

/**
 * Create middleware for validating Brain Events
 */
export function createBrainEventValidator() {
  return (data: unknown): ValidationResult => validateBrainEvent(data);
}

/**
 * Create middleware for validating Brain Commands
 */
export function createBrainCommandValidator() {
  return (data: unknown): ValidationResult => validateBrainCommand(data);
}

/**
 * Create middleware for validating WebSocket messages
 */
export function createRealtimeMessageValidator() {
  return (data: unknown): ValidationResult => validateRealtimeMessage(data);
}

// ============================================================================
// Error Formatting Utilities
// ============================================================================

/**
 * Format validation errors for API responses
 */
export function formatValidationErrors(errors: ValidationError[]): string[] {
  return errors.map(error => {
    const field = error.field ? `Field '${error.field}': ` : '';
    return `${field}${error.message}`;
  });
}

/**
 * Format validation errors for logging
 */
export function formatValidationErrorsForLogging(errors: ValidationError[]): string {
  return errors.map(error => {
    return `[${error.field}] ${error.message} (value: ${JSON.stringify(error.value)})`;
  }).join('; ');
}

// ============================================================================
// Performance Optimization
// ============================================================================

/**
 * Validate with caching for repeated validations of the same data
 */
const validationCache = new Map<string, ValidationResult>();

export function validateWithCache<T>(
  data: unknown,
  validator: (data: unknown) => ValidationResult,
  cacheKey?: string
): ValidationResult {
  const key = cacheKey || JSON.stringify(data);
  
  if (validationCache.has(key)) {
    return validationCache.get(key)!;
  }

  const result = validator(data);
  validationCache.set(key, result);
  
  // Limit cache size
  if (validationCache.size > 1000) {
    const firstKey = validationCache.keys().next().value;
    validationCache.delete(firstKey);
  }

  return result;
}

/**
 * Clear validation cache
 */
export function clearValidationCache(): void {
  validationCache.clear();
}

// ============================================================================
// Type-Safe Validation Wrappers
// ============================================================================

/**
 * Validate and type-guard Brain Event
 */
export function isBrainEventValid(data: unknown): data is BrainEvent {
  const result = validateBrainEvent(data);
  return result.valid;
}

/**
 * Validate and type-guard Brain Command
 */
export function isBrainCommandValid(data: unknown): data is BrainCommand {
  const result = validateBrainCommand(data);
  return result.valid;
}

/**
 * Validate and type-guard Realtime Message
 */
export function isRealtimeMessageValid(data: unknown): data is RealtimeMessage {
  const result = validateRealtimeMessage(data);
  return result.valid;
}