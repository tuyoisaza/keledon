#!/usr/bin/env node

/**
 * throttle.js — Enforce minimum delay between operations
 * Usage: node throttle.js <delay_ms> <command> [args...]
 * Example: node throttle.js 1000 read C:\\KELEDON\\landing\\src\\pages\\LoginPage.tsx
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node throttle.js <delay_ms> <command> [args...]');
        process.exit(1);
    }

    const delayMs = parseInt(args[0], 10) || 750;
    const cmdArgs = args.slice(1);

    if (isNaN(delayMs) || delayMs < 0) {
        console.error('Error: delay must be a non-negative integer (ms)');
        process.exit(1);
    }

    await sleep(delayMs);

    try {
        const { stdout, stderr } = await promisify(exec)(cmdArgs.join(' '));
        process.stdout.write(stdout);
        process.stderr.write(stderr);
        process.exit(0);
    } catch (err) {
        console.error('Command failed:', err.message);
        process.exit(1);
    }
}

main().catch(console.error);