#!/usr/bin/env node

// Cross-platform Qdrant Setup Script Node.js Wrapper
// This script provides a unified interface for Qdrant Docker management

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const isWindows = os.platform() === 'win32';
const scriptName = isWindows ? 'setup-qdrant.bat' : 'setup-qdrant.sh';
const scriptPath = path.join(process.cwd(), 'scripts', scriptName);

function executeScript(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: isWindows
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  try {
    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ Setup script not found: ${scriptPath}`);
      process.exit(1);
    }

    // Check if Docker is available
    try {
      await executeScript('docker', ['--version']);
    } catch (error) {
      console.error('❌ Docker is not installed or not available');
      console.error('Please install Docker from: https://www.docker.com/get-docker');
      process.exit(1);
    }

    // Execute the platform-specific script
    if (isWindows) {
      await executeScript('cmd', ['/c', scriptPath, ...args]);
    } else {
      // Make script executable on Unix systems
      try {
        await executeScript('chmod', ['+x', scriptPath]);
      } catch (error) {
        // chmod might fail on Windows, ignore
      }
      await executeScript(scriptPath, args);
    }

  } catch (error) {
    console.error('❌ Error executing Qdrant setup:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { executeScript };