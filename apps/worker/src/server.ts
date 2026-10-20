import { serve } from '@hono/node-server';
import { createApp } from './api/app';
import { getStorage } from './services/supabase';
import { executeHeartbeatBatch } from './engine/runner';

const PORT = 3000;
const app = createApp();

console.log('----------------------------------------------------');
console.log(' Starting Heartbeat Manager Standalone Native Server');
console.log(` Port: http://0.0.0.0:${PORT}`);
console.log('----------------------------------------------------');

const server = serve({
  fetch: (req) => {
    return app.fetch(req, {
      ENVIRONMENT: 'development',
      WORKER_NAME: 'heartbeat-engine-local',
      DEFAULT_CRON: '30 3 * * SUN',
    });
  },
  port: PORT,
  hostname: '0.0.0.0',
}, (info) => {
  console.log(`[Heartbeat Server] Running stably on http://localhost:${info.port}`);
});

// Periodic Local Scheduler Engine (Runs every 60 seconds to execute scheduled checks)
setInterval(async () => {
  try {
    const storage = getStorage();
    const projects = await storage.getProjects(true);
    if (projects.length === 0) return;

    // Check if any project is due for check
    const now = new Date();
    // Daily/hourly check ticker
    const isMinuteZero = now.getMinutes() === 0;
    if (isMinuteZero) {
      console.log(`[Local Scheduler] Running scheduled checks at ${now.toISOString()}`);
      await executeHeartbeatBatch(storage, {
        triggerType: 'scheduled',
        allowHttp: true,
      });
    }
  } catch (err) {
    console.error('[Local Scheduler Error]', err);
  }
}, 60000);

export default server;
