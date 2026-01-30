# Voice Activity Detection (VAD)

A real-time voice activity detection module using Web Audio API for detecting when a person is speaking.

## Features

- Real-time audio analysis using Web Audio API
- Configurable energy threshold for voice detection
- Minimum voice/silence duration controls
- Event-based system for voice start/stop/active states
- TypeScript support with proper typing
- Automatic resource cleanup

## Installation

This module is part of the agent audio package and should be used within the existing audio pipeline.

## Usage

### Basic Usage

```typescript
import { VoiceDetector } from './audio/vad';

// Get audio stream from microphone
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// Create voice detector instance
const vad = new VoiceDetector({
  energyThreshold: 0.01,     // Lower values detect quieter sounds
  minVoiceDuration: 200,     // Minimum ms of continuous voice to trigger start event
  minSilenceDuration: 500,   // Minimum ms of continuous silence to trigger stop event
}, {
  onVoiceStart: () => console.log('Voice started'),
  onVoiceStop: () => console.log('Voice stopped'),
  onVoiceActive: (energy) => console.log('Current energy:', energy),
  onError: (error) => console.error('VAD Error:', error)
});

// Initialize with audio stream
await vad.init(stream);

// Start listening for voice activity
vad.start();

// Later, when done
await vad.destroy();
```

### Advanced Configuration

```typescript
const vad = new VoiceDetector({
  energyThreshold: 0.02,         // Adjust sensitivity (0.0-1.0)
  minVoiceDuration: 150,         // Faster voice start detection
  minSilenceDuration: 300,       // Faster voice stop detection
  fftSize: 4096,                 // Larger FFT for better frequency resolution
  smoothingTimeConstant: 0.9,    // More smoothing for stable readings
});
```

### Checking Status

```typescript
// Check if voice is currently detected
const isSpeaking = vad.isVoiceActive();

// Get current energy level
const energy = vad.getCurrentLevel();

// Get overall status
const status = vad.getStatus();
console.log(status); // { isActive: true, isListening: true, currentEnergy: 0.05 }
```

### Updating Options at Runtime

```typescript
// Adjust settings while the detector is running
vad.setOptions({
  energyThreshold: 0.03,
  minVoiceDuration: 250
});
```

## API

### Constructor

```typescript
new VoiceDetector(options?: VoiceDetectorOptions, events?: VoiceDetectorEvents)
```

#### VoiceDetectorOptions

- `energyThreshold`: Threshold for voice detection (0.0-1.0), default: 0.01
- `minVoiceDuration`: Minimum ms of voice to trigger start event, default: 200
- `minSilenceDuration`: Minimum ms of silence to trigger stop event, default: 500
- `fftSize`: FFT size for analyser node, default: 2048
- `smoothingTimeConstant`: Smoothing for analyser, default: 0.8

#### VoiceDetectorEvents

- `onVoiceStart`: Called when voice activity starts
- `onVoiceStop`: Called when voice activity stops
- `onVoiceActive`: Called continuously during voice activity with current energy
- `onError`: Called when an error occurs

### Methods

- `init(stream: MediaStream)`: Initialize with audio stream
- `start()`: Start listening for voice activity
- `stop()`: Stop listening for voice activity
- `isVoiceActive()`: Check if voice is currently detected
- `getCurrentLevel()`: Get current energy level
- `setOptions(options: Partial<VoiceDetectorOptions>)`: Update options at runtime
- `getStatus()`: Get current status object
- `destroy()`: Clean up all resources

## Algorithm

The VAD implementation uses an energy-based approach:

1. Continuously analyzes the input audio stream using Web Audio API
2. Calculates the average energy level of the audio signal
3. Compares energy against the configured threshold
4. Applies minimum duration filters to prevent rapid state changes
5. Emits appropriate events based on voice activity state transitions