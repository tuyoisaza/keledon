#!/usr/bin/env node
// watchdog.js - Reliable 15-minute status pinger for KELEDON DevPriming
// Runs as background process; survives gateway disconnects via CLI calls

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const LOG_FILE = path.join(__dirname, 'watchdog.log');
const PING_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RETRIES = 3;

async function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  await fs.appendFile(LOG_FILE, line);
}

async function sendPing() {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // backoff
      const cmd = `clawdbot message send --channel whatsapp --to "+525534583291" --message "📊 DevPriming ping: alive (watchdog v1)"`;
      const { stdout, stderr } = await execProm(cmd);
      if (stderr) throw new Error(`CLI error: ${stderr}`);
      await log(`✅ Ping sent: ${stdout.trim() || 'ok'}`);
      return true;
    } catch (err) {
      await log(`⚠️ Ping failed (attempt ${attempt + 1}/${MAX_RETRIES}): ${err.message}`);
      attempt++;
    }
  }
  await log(`❌ Ping failed after ${MAX_RETRIES} attempts`);
  return false;
}

function execProm(command) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve({ stdout, stderr });
    });
  });
}

async function start() {
  await log('🚀 Watchdog started');
  
  // Send initial ping immediately
  await sendPing();

  // Then schedule every 15 minutes
  setInterval(async () => {
    await sendPing();
  }, PING_INTERVAL_MS);

  // Handle SIGINT/SIGTERM gracefully
  process.on('SIGINT', async () => {
    await log('🛑 Watchdog shutting down');
    process.exit(0);
  });

  process.on('uncaughtException', async (err) => {
    await log(`💥 Uncaught exception: ${err.stack}`);
    process.exit(1);
  });
}

start().catch(err => {
  console.error('Watchdog startup failed:', err);
  process.exit(1);
});