import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const WORKER_DIR = path.resolve(ROOT_DIR, 'apps/worker');

const WORKER_PORT = 8787;
const MIRROR_PORTS = [3000, 5173];

console.log('=====================================================');
console.log(' Starting Heartbeat Manager Multi-Port Server Suite');
console.log(` Primary Engine: Port ${WORKER_PORT}`);
console.log(` Mirror Gateways: Ports ${MIRROR_PORTS.join(', ')}`);
console.log('=====================================================');

// 1. Spawn Cloudflare Worker via Wrangler
const wranglerProcess = spawn(
  'pnpm',
  ['exec', 'wrangler', 'dev', '--ip', '0.0.0.0', '--port', String(WORKER_PORT), '--test-scheduled', '--show-interactive-dev-session', 'false'],
  {
    cwd: WORKER_DIR,
    stdio: 'inherit',
    env: { ...process.env },
  }
);

wranglerProcess.on('exit', (code, signal) => {
  console.log(`[Wrangler] Exited with code ${code} and signal ${signal}`);
  process.exit(code || 0);
});

// 2. Poll until Worker port 8787 is alive
async function waitForWorkerReady() {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${WORKER_PORT}/health`, (res) => {
          if (res.statusCode === 200) resolve(true);
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy());
      });
      console.log(`[Suite] Cloudflare Worker is active on port ${WORKER_PORT}!`);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  console.warn('[Suite] Worker took longer than expected to start; starting mirrors anyway...');
  return false;
}

// 3. Start Gateway Mirror Listeners
function startMirror(port) {
  const server = http.createServer((req, res) => {
    const options = {
      hostname: '127.0.0.1',
      port: WORKER_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${WORKER_PORT}`,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gateway unavailable', details: err.message }));
    });

    req.pipe(proxyReq, { end: true });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Suite] Port ${port} is in use; skipping.`);
    } else {
      console.error(`[Suite] Error on port ${port}:`, err);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Suite] Live mirror listening on: http://localhost:${port}`);
  });

  return server;
}

await waitForWorkerReady();

for (const port of MIRROR_PORTS) {
  startMirror(port);
}

// Keep process permanently alive
setInterval(() => {}, 60000);

process.on('SIGINT', () => {
  wranglerProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  wranglerProcess.kill('SIGTERM');
  process.exit(0);
});
