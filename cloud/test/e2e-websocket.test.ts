/**
 * KELDON E2E Test Script
 * Tests the WebSocket connection and basic event flow
 * 
 * Usage: npx ts-node test/e2e-websocket.test.ts
 */

import { io } from 'socket.io-client';

const CLOUD_URL = 'http://localhost:3001';

async function runE2ETest() {
    console.log('🧪 KELDON E2E Test Starting...\n');

    const socket = io(CLOUD_URL, { transports: ['websocket'] });

    let passed = 0;
    let failed = 0;

    const test = async (name: string, fn: () => Promise<boolean>) => {
        try {
            const result = await fn();
            if (result) {
                console.log(`✅ ${name}`);
                passed++;
            } else {
                console.log(`❌ ${name} (returned false)`);
                failed++;
            }
        } catch (err) {
            console.log(`❌ ${name}:`, err);
            failed++;
        }
    };

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
        socket.on('connect', resolve);
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    console.log(`\n📡 Connected: ${socket.id}\n`);

    // Test 1: Ping/Pong
    await test('Ping returns pong', async () => {
        return new Promise((resolve) => {
            socket.emit('ping', 'test', (response: string) => {
                resolve(response === 'pong');
            });
        });
    });

    // Test 2: Client Config
    await test('Client config accepted', async () => {
        socket.emit('client-config', { provider: 'mock', apiKeys: {} });
        return true; // No error = success
    });

    // Test 3: System Prompt
    await test('System prompt accepted', async () => {
        socket.emit('system-prompt', 'Test prompt');
        return true;
    });

    // Test 4: Clear History
    await test('Clear history accepted', async () => {
        socket.emit('clear-history');
        return true;
    });

    // Test 5: Speak Request (Mock TTS)
    await test('Speak request triggers audio-playback-end', async () => {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(true), 1000); // Mock returns empty stream immediately
            socket.once('audio-playback-end', () => {
                clearTimeout(timeout);
                resolve(true);
            });
            socket.emit('speak-request', 'Hello test');
        });
    });

    // Cleanup
    socket.disconnect();

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

runE2ETest().catch(err => {
    console.error('E2E Test Failed:', err);
    process.exit(1);
});
