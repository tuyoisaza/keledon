const http = require('http');
const { spawn } = require('child_process');
const net = require('net');

const PORT = process.env.LAUNCHER_PORT || 3100;
const CLOUD_DIR = process.env.CLOUD_DIR || 'C:\\Keldon\\cloud';
const LANDING_DIR = process.env.LANDING_DIR || 'C:\\Keldon\\landing';
const CLOUD_HOST = process.env.CLOUD_HOST || '127.0.0.1';
const CLOUD_PORT = Number(process.env.CLOUD_PORT || 3001);
const AUTO_RESTART = (process.env.AUTO_RESTART || 'true').toLowerCase() === 'true';

let lastStartAt = null;
let lastError = null;
let cloudProcess = null;
let landingProcess = null;

function json(res, status, payload) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(payload));
}

function checkCloudReachable(timeoutMs = 500) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host: CLOUD_HOST, port: CLOUD_PORT });
        const timer = setTimeout(() => {
            socket.destroy();
            resolve(false);
        }, timeoutMs);

        socket.on('connect', () => {
            clearTimeout(timer);
            socket.end();
            resolve(true);
        });

        socket.on('error', () => {
            clearTimeout(timer);
            resolve(false);
        });
    });
}

function startProcess({ name, cwd, command, args, onExit }) {
    const child = spawn(command, args, {
        cwd,
        stdio: 'ignore'
    });
    child.on('exit', (code) => {
        if (onExit) onExit(code);
        if (AUTO_RESTART) {
            console.log(`[Launcher] ${name} exited with ${code}. Restarting...`);
            startProcess({ name, cwd, command, args, onExit });
        }
    });
    return child;
}

function ensureCloudProcess() {
    if (cloudProcess && cloudProcess.exitCode === null) {
        return cloudProcess;
    }
    cloudProcess = startProcess({
        name: 'cloud',
        cwd: CLOUD_DIR,
        command: 'cmd',
        args: ['/c', 'npm', 'run', 'start:dev']
    });
    return cloudProcess;
}

function ensureLandingProcess() {
    if (landingProcess && landingProcess.exitCode === null) {
        return landingProcess;
    }
    landingProcess = startProcess({
        name: 'landing',
        cwd: LANDING_DIR,
        command: 'cmd',
        args: ['/c', 'npm', 'run', 'dev']
    });
    return landingProcess;
}

async function handleStartCloud(res) {
    try {
        lastError = null;
        lastStartAt = new Date().toISOString();
        const child = ensureCloudProcess();
        json(res, 200, { success: true, startedAt: lastStartAt, pid: child.pid });
    } catch (error) {
        lastError = error?.message || String(error);
        json(res, 500, { success: false, error: lastError });
    }
}

async function handleStartLanding(res) {
    try {
        lastError = null;
        lastStartAt = new Date().toISOString();
        const child = ensureLandingProcess();
        json(res, 200, { success: true, startedAt: lastStartAt, pid: child.pid });
    } catch (error) {
        lastError = error?.message || String(error);
        json(res, 500, { success: false, error: lastError });
    }
}

async function handleStartAll(res) {
    try {
        lastError = null;
        lastStartAt = new Date().toISOString();
        const cloud = ensureCloudProcess();
        const landing = ensureLandingProcess();
        json(res, 200, { success: true, startedAt: lastStartAt, pids: { cloud: cloud.pid, landing: landing.pid } });
    } catch (error) {
        lastError = error?.message || String(error);
        json(res, 500, { success: false, error: lastError });
    }
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        return json(res, 204, {});
    }

    if (req.url === '/health') {
        return json(res, 200, { status: 'ok' });
    }

    if (req.url === '/status') {
        const reachable = await checkCloudReachable();
        return json(res, 200, {
            cloudReachable: reachable,
            lastStartAt,
            lastError,
            processes: {
                cloud: cloudProcess?.pid || null,
                landing: landingProcess?.pid || null
            }
        });
    }

    if (req.url === '/start-cloud' && req.method === 'POST') {
        return handleStartCloud(res);
    }

    if (req.url === '/start-landing' && req.method === 'POST') {
        return handleStartLanding(res);
    }

    if (req.url === '/start-all' && req.method === 'POST') {
        return handleStartAll(res);
    }

    return json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
    console.log(`Keledon launcher listening on ${PORT}`);
});
