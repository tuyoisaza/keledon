const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

const rootDir = process.cwd();
const logDir = path.join(rootDir, 'logs', 'dev');
const configPath = path.join(rootDir, 'dev-services.config.js');
const cloudUrl = process.env.CLOUD_URL || 'http://localhost:3001';
const providerCatalogUrl = process.env.PROVIDER_CATALOG_URL || `${cloudUrl}/api/provider-catalog?autoStart=true&localOnly=true`;

const children = [];

function ensureLogDir() {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
}

function loadFallbackServices() {
    if (fs.existsSync(configPath)) {
        const config = require(configPath);
        if (Array.isArray(config)) return config;
        if (Array.isArray(config?.services)) return config.services;
    }

    return [
        {
            name: 'cloud',
            cwd: './cloud',
            command: 'npm run start:dev',
            waitFor: { url: 'http://localhost:3001' }
        },
        {
            name: 'landing',
            cwd: './landing',
            command: 'npm run dev',
            waitFor: { url: 'http://localhost:5173' }
        }
    ];
}

function sanitizeName(name) {
    return String(name || 'service').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

function requestOk(url) {
    return new Promise((resolve) => {
        let parsed;
        try {
            parsed = new URL(url);
        } catch (error) {
            resolve(false);
            return;
        }

        const client = parsed.protocol === 'https:' ? https : http;
        const req = client.request(parsed, { method: 'GET' }, (res) => {
            res.resume();
            resolve(res.statusCode && res.statusCode < 500);
        });
        req.on('error', () => resolve(false));
        req.end();
    });
}

async function waitForUrl(waitFor, serviceName) {
    if (!waitFor?.url) return;
    const timeoutMs = waitFor.timeoutMs ?? 60000;
    const intervalMs = waitFor.intervalMs ?? 1000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const ok = await requestOk(waitFor.url);
        if (ok) {
            console.log(`[dev-orchestrator] ${serviceName} is ready at ${waitFor.url}`);
            return;
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    console.warn(`[dev-orchestrator] Timed out waiting for ${serviceName} at ${waitFor.url}`);
}

function startService(service, startedCommands) {
    const name = service.name || 'service';
    const command = service.command;
    if (!command) {
        console.warn(`[dev-orchestrator] Skipping ${name}: missing command`);
        return null;
    }

    if (startedCommands?.has(command)) {
        console.log(`[dev-orchestrator] Skipping ${name}: command already running`);
        return null;
    }

    const safeName = sanitizeName(name);
    const stdoutPath = path.join(logDir, `${safeName}.out.log`);
    const stderrPath = path.join(logDir, `${safeName}.err.log`);
    const cwd = service.cwd ? path.resolve(rootDir, service.cwd) : rootDir;
    const env = { ...process.env, ...(service.env || {}) };

    console.log(`[dev-orchestrator] Starting ${name}: ${command}`);
    const child = spawn(command, {
        cwd,
        env,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    const stdoutStream = fs.createWriteStream(stdoutPath, { flags: 'a' });
    const stderrStream = fs.createWriteStream(stderrPath, { flags: 'a' });

    child.stdout.pipe(stdoutStream);
    child.stderr.pipe(stderrStream);

    child.on('exit', (code, signal) => {
        console.log(`[dev-orchestrator] ${name} exited (${code ?? 'null'}) ${signal ?? ''}`.trim());
        stdoutStream.end();
        stderrStream.end();
    });

    children.push(child);
    if (startedCommands) {
        startedCommands.add(command);
    }
    return child;
}

async function startFallbackServices(services, startedCommands) {
    for (const service of services) {
        startService(service, startedCommands);
        if (service.waitFor) {
            await waitForUrl(service.waitFor, service.name || 'service');
        }
        if (service.delayMs) {
            await new Promise(resolve => setTimeout(resolve, service.delayMs));
        }
    }
}

function parseEnvList(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.map(entry => String(entry).trim()).filter(Boolean);
    }
    return String(value)
        .split(/[,\n\s]+/)
        .map(entry => entry.trim())
        .filter(Boolean);
}

function getMetadataBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
}

function getMetadataNumber(value, fallback = 0) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return fallback;
}

async function fetchProviderCatalog() {
    const ok = await requestOk(providerCatalogUrl);
    if (!ok) {
        return [];
    }

    return new Promise((resolve) => {
        let parsed;
        try {
            parsed = new URL(providerCatalogUrl);
        } catch (error) {
            resolve([]);
            return;
        }

        const client = parsed.protocol === 'https:' ? https : http;
        const req = client.request(parsed, { method: 'GET' }, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const parsedBody = JSON.parse(body || '[]');
                    resolve(Array.isArray(parsedBody) ? parsedBody : []);
                } catch (error) {
                    resolve([]);
                }
            });
        });
        req.on('error', () => resolve([]));
        req.end();
    });
}

function buildProviderServices(entries) {
    return entries
        .map((entry) => {
            const metadata = entry.metadata || {};
            const autoStart = getMetadataBool(metadata.auto_start);
            if (!autoStart) return null;
            const command = metadata.start_command;
            if (!command) return null;

            const requiresApiKey = getMetadataBool(metadata.requires_api_key);
            const requiredEnv = parseEnvList(metadata.required_env || metadata.requiredEnv || metadata.api_key_env);
            if (requiresApiKey && requiredEnv.length > 0) {
                const hasKeys = requiredEnv.every((key) => Boolean(process.env[key]));
                if (!hasKeys) return null;
            } else if (requiresApiKey && requiredEnv.length === 0) {
                return null;
            }

            const env = metadata.env && typeof metadata.env === 'object' ? metadata.env : undefined;

            return {
                name: entry.id || entry.name,
                command,
                cwd: metadata.cwd || undefined,
                env,
                waitFor: metadata.wait_url ? { url: metadata.wait_url } : undefined,
                bootOrder: getMetadataNumber(metadata.boot_order, 0),
            };
        })
        .filter(Boolean);
}

async function startServicesByBootOrder(services, startedCommands) {
    const grouped = new Map();
    services.forEach((service) => {
        const order = Number.isFinite(service.bootOrder) ? service.bootOrder : 0;
        const list = grouped.get(order) || [];
        list.push(service);
        grouped.set(order, list);
    });

    const orders = Array.from(grouped.keys()).sort((a, b) => a - b);
    for (const order of orders) {
        const tier = grouped.get(order) || [];
        tier.forEach((service) => startService(service, startedCommands));
        await Promise.all(tier.map((service) => waitForUrl(service.waitFor, service.name || 'service')));
    }
}

async function run() {
    ensureLogDir();
    const startedCommands = new Set();
    const fallbackServices = loadFallbackServices().filter(service => service.enabled !== false);

    await startFallbackServices(fallbackServices, startedCommands);

    const providerEntries = await fetchProviderCatalog();
    if (providerEntries.length === 0) {
        console.warn('[dev-orchestrator] Provider catalog unavailable or empty; skipping auto-start providers.');
        console.log('[dev-orchestrator] Core services launched. Logs in logs/dev');
        return;
    }

    const providerServices = buildProviderServices(providerEntries);
    if (providerServices.length === 0) {
        console.log('[dev-orchestrator] No auto-start providers configured. Logs in logs/dev');
        return;
    }

    await startServicesByBootOrder(providerServices, startedCommands);
    console.log('[dev-orchestrator] All services launched. Logs in logs/dev');
}

function shutdown() {
    for (const child of children) {
        if (!child.killed) {
            child.kill();
        }
    }
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

run().catch((error) => {
    console.error('[dev-orchestrator] Failed to start services:', error);
    process.exit(1);
});
