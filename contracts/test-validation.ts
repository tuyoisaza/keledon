/**
 * Quick test for the validation system
 * Tests basic functionality to ensure everything works
 */

import { 
  initializeValidationService, 
  validationService 
} from './service.js';

async function testValidationSystem() {
  console.log('🧪 Testing KELEDON Validation System...\n');

  try {
    // Initialize the service
    console.log('📦 Initializing validation service...');
    await initializeValidationService();
    console.log('✅ Validation service initialized successfully\n');

    // Test valid Brain Event
    console.log('🧠 Testing valid Brain Event...');
    const validBrainEvent = {
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      session_id: '550e8400-e29b-41d4-a716-446655440001',
      timestamp: '2026-01-28T12:00:00.000Z',
      type: 'text_input',
      payload: {
        text: 'Hello world',
        confidence: 0.95,
        provider: 'deepgram'
      }
    };

    const brainEventResult = validationService.validateBrainEvent(validBrainEvent);
    console.log('Brain Event validation:', brainEventResult.valid ? '✅ PASSED' : '❌ FAILED');
    if (!brainEventResult.valid) {
      console.log('Errors:', brainEventResult.errors);
    }

    // Test invalid Brain Event
    console.log('\n🚫 Testing invalid Brain Event...');
    const invalidBrainEvent = {
      event_id: 'invalid-uuid',
      session_id: '550e8400-e29b-41d4-a716-446655440001',
      timestamp: 'invalid-date',
      type: 'invalid_type',
      payload: {}
    };

    const invalidBrainEventResult = validationService.validateBrainEvent(invalidBrainEvent);
    console.log('Invalid Brain Event validation:', invalidBrainEventResult.valid ? '❌ FAILED' : '✅ PASSED');
    if (!invalidBrainEventResult.valid) {
      console.log('Expected errors:', invalidBrainEventResult.errors.length);
    }

    // Test valid Brain Command
    console.log('\n🎯 Testing valid Brain Command...');
    const validBrainCommand = {
      command_id: '550e8400-e29b-41d4-a716-446655440002',
      session_id: '550e8400-e29b-41d4-a716-446655440001',
      timestamp: '2026-01-28T12:00:01.000Z',
      type: 'say',
      payload: {
        text: 'Hello back!',
        interruptible: true,
        provider: 'elevenlabs'
      }
    };

    const brainCommandResult = validationService.validateBrainCommand(validBrainCommand);
    console.log('Brain Command validation:', brainCommandResult.valid ? '✅ PASSED' : '❌ FAILED');
    if (!brainCommandResult.valid) {
      console.log('Errors:', brainCommandResult.errors);
    }

    // Test valid Realtime Message
    console.log('\n📡 Testing valid Realtime Message...');
    const validRealtimeMessage = {
      message_id: '550e8400-e29b-41d4-a716-446655440003',
      timestamp: '2026-01-28T12:00:02.000Z',
      direction: 'agent_to_cloud',
      message_type: 'brain_event',
      session_id: '550e8400-e29b-41d4-a716-446655440001',
      payload: validBrainEvent
    };

    const realtimeMessageResult = validationService.validateRealtimeMessage(validRealtimeMessage);
    console.log('Realtime Message validation:', realtimeMessageResult.valid ? '✅ PASSED' : '❌ FAILED');
    if (!realtimeMessageResult.valid) {
      console.log('Errors:', realtimeMessageResult.errors);
    }

    // Test validation stats
    console.log('\n📊 Validation Statistics:');
    const stats = validationService.getStats();
    console.log(`Total validations: ${stats.totalValidations}`);
    console.log(`Successful: ${stats.successfulValidations}`);
    console.log(`Failed: ${stats.failedValidations}`);
    console.log(`Success rate: ${stats.successRate.toFixed(1)}%`);

    // Test health check
    console.log('\n🏥 Health Check:');
    const health = validationService.healthCheck();
    console.log('Service status:', health.status);
    console.log('Initialized:', health.initialized);

    console.log('\n🎉 All tests completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Export for use in scripts
export { testValidationSystem };

// Run tests if this file is executed directly
if (require.main === module) {
  testValidationSystem()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}