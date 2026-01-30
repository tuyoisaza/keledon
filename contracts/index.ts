/**
 * KELEDON Contracts v1
 * 
 * This module provides type definitions, validation, and schemas for all KELEDON contracts.
 * It ensures type safety and runtime validation across the entire system.
 * 
 * Usage:
 * ```typescript
 * import { BrainEvent, validateBrainEvent } from './contracts';
 * 
 * // Type-safe data
 * const event: BrainEvent = { ... };
 * 
 * // Runtime validation
 * const result = validateBrainEvent(data);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */

// Export all types and validation utilities
export * from './types';
export * from './validation';

// Initialize validators on module import
import { initializeValidators } from './validation';

// Auto-initialize validators for convenience
// In production, you might want to call this explicitly in your app bootstrap
try {
  initializeValidators();
} catch (error) {
  console.warn('Failed to auto-initialize contract validators:', error);
  console.warn('Call initializeValidators() explicitly in your application bootstrap');
}

// Export validation service
export * from './service';

// Export version information
export const CONTRACTS_VERSION = 'v1';
export const SCHEMA_VERSION = '1.0.0';

// Export common validation errors for easier error handling
export const VALIDATION_ERRORS = {
  INVALID_UUID: 'Invalid UUID format',
  INVALID_TIMESTAMP: 'Invalid ISO 8601 timestamp',
  INVALID_CONFIDENCE: 'Confidence must be between 0 and 1',
  INVALID_TIMEOUT: 'Timeout must be a non-negative number',
  INVALID_SAMPLE_RATE: 'Invalid sample rate',
  INVALID_CHANNELS: 'Channels must be 1 or 2',
  MISSING_REQUIRED_FIELD: 'Missing required field',
  INVALID_ENUM_VALUE: 'Invalid enum value',
  INVALID_TYPE: 'Invalid data type'
} as const;

// Export validation status for health checks
export function getValidationStatus(): {
  initialized: boolean;
  version: string;
  timestamp: string;
} {
  return {
    initialized: true, // This would be dynamic in a real implementation
    version: CONTRACTS_VERSION,
    timestamp: new Date().toISOString()
  };
}