// Main entry point - Import and start the background service
import { BackgroundService } from './background-service.js';

// Initialize the background service
const backgroundService = new BackgroundService();
backgroundService.start();