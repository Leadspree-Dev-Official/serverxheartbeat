import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const WORKER_DIR = path.resolve(ROOT_DIR, 'apps/worker');

const PRIMARY_PORT = 3000;
const MIRROR_PORT = 8787;

let currentChild = null;
let isShuttingDown = false;
let consecutiveFailures = 0;
let isStarting = false;

function spawnWorker() {
  if (isShuttingDown) return;
  isStarting = true;
  consecutiveFailures = 0;

  console.log(`[Supervisor] Spawning Cloudflare Worker engine on port ${PRIMARY_PORT}...`);

  currentChild = spawn(
    'pnpm',
    ['exec', 'wrangler', 'dev', '--port', String(PRIMARY_PORT), '--ip', '0.0.0.0', '--test-scheduled', '--show-interactive-dev-session', 'false'],
    {
      cwd: WORKER_DIR,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env },
      detached: true,
    }
  );

  currentChild.on('exit', (code, signal) => {
    console.log(`[Supervisor] Worker process exited with code ${code}, signal ${signal}`);
    currentChild = null;
    if (!isShuttingDown) {
      console.log('[Supervisor] Restarting worker in 1.5s...');
      setTimeout(spawnWorker, 1500);
    }
  });

  // Give worker 8 seconds grace period to initialize
  setTimeout(() => {
    isStarting = false;
  }, 8000);
}

function killWorker() {
  if (currentChild && currentChild.pid) {
    try {
      // Kill process group
      process.kill(-currentChild.pid, 'SIGKILL');
    } catch {
      try {
        currentChild.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
  }
}

// Mirror Server (Port 8787 -> Port 3000)
const mirrorServer = http.createServer((req, res) => {
  const proxy = http.request(
    {
      hostname: '127.0.0.1',
      port: PRIMARY_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${PRIMARY_PORT}` },
    },
    (pRes) => {
      res.writeHead(pRes.statusCode || 200, pRes.headers);
      pRes.pipe(res, { end: true });
    }
  );

  proxy.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Worker is starting or recovering...', details: err.message }));
  });

  req.pipe(proxy, { end: true });
});

mirrorServer.listen(MIRROR_PORT, '0.0.0.0', () => {
  console.log(`[Supervisor] Port ${MIRROR_PORT} mirror active -> forwarding to ${PRIMARY_PORT}`);
});

// Auto-Healing Watchdog
setInterval(() => {
  if (isShuttingDown || isStarting) return;

  const req = http.get(`http://127.0.0.1:${PRIMARY_PORT}/api/health`, { timeout: 2500 }, (res) => {
    if (res.statusCode === 200) {
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
      handleWatchdogFailure(`HTTP status ${res.statusCode}`);
    }
  });

  req.on('timeout', () => {
    req.destroy();
    consecutiveFailures++;
    handleWatchdogFailure('Health check timed out');
  });

  req.on('error', (err) => {
    consecutiveFailures++;
    handleWatchdogFailure(`Connection error: ${err.message}`);
  });
}, 5000);

function handleWatchdogFailure(reason) {
  console.warn(`[Watchdog] Health check check failed (${consecutiveFailures}/2): ${reason}`);
  if (consecutiveFailures >= 2 && !isStarting && !isShuttingDown) {
    console.error('[Watchdog] Worker dropped connection or crashed. Auto-recovering immediately...');
    killWorker();
    spawnWorker();
  }
}

// Start initial worker
spawnWorker();

// Graceful cleanup
function cleanup() {
  isShuttingDown = true;
  console.log('[Supervisor] Shutting down supervisor and worker...');
  killWorker();
  mirrorServer.close();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
