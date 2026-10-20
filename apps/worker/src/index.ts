import { createApp, Bindings } from './api/app';
import { getStorage } from './services/supabase';
import { executeHeartbeatBatch } from './engine/runner';

const app = createApp();

export default {
  /**
   * HTTP Fetch Handler for API Requests & UI Static Assets
   */
  async fetch(request: Request, env: Bindings & { ASSETS?: Fetcher }, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // API endpoints and health checks are handled by Hono
    if (url.pathname.startsWith('/api') || url.pathname === '/health') {
      return app.fetch(request, env, ctx);
    }

    // Static assets (React Dashboard SPA) handled by Cloudflare Workers Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return app.fetch(request, env, ctx);
  },

  /**
   * Scheduled Event Handler for Cloudflare Cron Triggers
   * Runs every Sunday at 03:30 UTC (9:00 AM IST)
   */
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void> {
    console.log(`[Heartbeat Cron] Invoked at ${new Date(event.scheduledTime).toISOString()} with cron: "${event.cron}"`);

    const executionPromise = (async () => {
      try {
        const storage = getStorage(env);
        const summary = await executeHeartbeatBatch(storage, {
          triggerType: 'scheduled',
          allowHttp: env.ENVIRONMENT === 'development',
        });
        console.log(
          `[Heartbeat Cron] Run ${summary.run.id} finished with status: ${summary.run.status}. ` +
          `Success: ${summary.run.successful_count}, Failed: ${summary.run.failed_count}, Total: ${summary.run.total_projects}`
        );
      } catch (err) {
        console.error('[Heartbeat Cron] Execution error during scheduled heartbeat batch:', err);
      }
    })();

    ctx.waitUntil(executionPromise);
  },
};
