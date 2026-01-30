// Main entry point - ES Module for Chrome Extension
import { BackgroundService } from './background-service.js';

// Initialize and start the background service
const backgroundService = new BackgroundService();
backgroundService.start();