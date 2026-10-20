import { serve } from '@hono/node-server';
import { createApp } from './apps/worker/src/api/app';
import { getStorage } from './apps/worker/src/services/supabase';
import { executeHeartbeatBatch } from './apps/worker/src/engine/runner';

const PORT = 3000;
const app = createApp();

console.log('====================================================');
console.log(' HEARTBEAT MANAGER PERMANENT NATIVE NODE SERVER');
console.log(` Bound directly to: http://0.0.0.0:${PORT}`);
console.log(' Zero Miniflare/workerd sleep disconnects');
console.log('====================================================');

serve({
  fetch: (req) => {
    return app.fetch(req, {
      ENVIRONMENT: 'development',
      WORKER_NAME: 'heartbeat-engine-native',
      DEFAULT_CRON: '30 3 * * SUN',
    });
  },
  port: PORT,
  hostname: '0.0.0.0',
}, (info) => {
  console.log(`[Native Server] Ready and rock-solid at http://localhost:${info.port}`);
});

// Real-time Local Scheduler (Checks every 60 seconds if scheduled runs should execute)
setInterval(async () => {
  try {
    const storage = getStorage();
    const projects = await storage.getProjects(true);
    if (projects.length === 0) return;

    const now = new Date();
    // Daily/hourly check on minute 0
    if (now.getMinutes() === 0) {
      console.log(`[Local Scheduler] Executing scheduled heartbeat run at ${now.toISOString()}`);
      await executeHeartbeatBatch(storage, {
        triggerType: 'scheduled',
        allowHttp: true,
      });
    }
  } catch (err) {
    console.error('[Scheduler Error]', err);
  }
}, 60000);

// Prevent unhandled rejection crashes
process.on('unhandledRejection', (reason) => {
  console.warn('[Server Warning] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server Error] Uncaught exception:', err);
});
