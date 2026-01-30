#!/usr/bin/env ts-node

/**
 * throttle.ts — Enforce minimum delay between operations
 * Usage: 
 *   node throttle.ts [ms] [command...]
 * Example:
 *   node throttle.ts 1000 read C:\KELEDON\landing\src\pages\LoginPage.tsx
 * 
 * If no delay is provided, defaults to 1000ms (1s).
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node throttle.ts <delay_ms> <command> [args...]');
        process.exit(1);
    }

    const delayMs = parseInt(args[0], 10);
    const cmdArgs = args.slice(1);

    // Validate delay
    if (isNaN(delayMs) || delayMs < 0) {
        console.error('Error: delay must be a non-negative integer (ms)');
        process.exit(1);
    }

    // Wait for delay
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Execute command
    try {
        const { stdout, stderr } = await execAsync(cmdArgs.join(' '));
        process.stdout.write(stdout);
        process.stderr.write(stderr);
        process.exit(0);
    } catch (err: any) {
        console.error('Command failed:', err.message);
        process.exit(1);
    }
}

main().catch(console.error);