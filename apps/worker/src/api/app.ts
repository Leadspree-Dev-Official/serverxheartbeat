import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  createProjectSchema,
  updateProjectSchema,
  endpointTestSchema,
  scheduleUpdateSchema,
  cronExpressionRegex,
  DEFAULT_CRON_EXPRESSION,
  DEFAULT_TIMEZONE,
  DashboardMetrics,
} from '@heartbeat/shared';
import { getStorage } from '../services/supabase';
import { CloudflareService } from '../services/cloudflare';
import { executeHeartbeatBatch } from '../engine/runner';
import { getConnector } from '../engine/connectors';
import { validateUrlForSSRF } from '../engine/ssrf';
import { maskSecret, sanitizeErrorMessage } from '../services/crypto';
import { EmailService } from '../services/email';
import { UI_BUNDLE } from './ui_bundle';

export type Bindings = {
  ENVIRONMENT?: string;
  WORKER_NAME?: string;
  DEFAULT_CRON?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
};

export function createApp() {
  const app = new Hono<{ Bindings: Bindings }>();

  // CORS middleware for Vite frontend
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Health check for worker
  app.get('/health', (c) => {
    return c.json({ status: 'ok', service: 'heartbeat-engine', timestamp: new Date().toISOString() });
  });
  app.get('/api/health', (c) => {
    return c.json({ status: 'ok', service: 'heartbeat-engine', timestamp: new Date().toISOString() });
  });

  // Embedded Static Assets
  app.get(UI_BUNDLE.jsPath, (c) => {
    return c.text(UI_BUNDLE.jsContent, 200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  });

  app.get(UI_BUNDLE.cssPath, (c) => {
    return c.text(UI_BUNDLE.cssContent, 200, {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  });

  // Root and SPA route fallback
  app.get('/', (c) => {
    return c.html(UI_BUNDLE.html, 200, {
      'Content-Type': 'text/html; charset=utf-8',
    });
  });

  // =========================================================================
  // DASHBOARD METRICS
  // =========================================================================
  app.get('/api/dashboard/metrics', async (c) => {
    const storage = getStorage(c.env);
    const projects = await storage.getProjects();
    const runs = await storage.getRuns(10);
    const schedules = await storage.getSchedules();
    const deployments = await storage.getDeployments(1);

    const activeSchedule = schedules[0];
    const cron = activeSchedule?.cron_expression || DEFAULT_CRON_EXPRESSION;
    const tz = activeSchedule?.timezone || DEFAULT_TIMEZONE;

    const cfService = new CloudflareService({
      apiToken: c.env?.CLOUDFLARE_API_TOKEN,
      accountId: c.env?.CLOUDFLARE_ACCOUNT_ID,
      workerName: c.env?.WORKER_NAME || 'heartbeat-engine',
    });
    const cfStatus = await cfService.getWorkerStatus(cron);

    const total = projects.length;
    const enabled = projects.filter((p) => p.enabled).length;
    const healthy = projects.filter((p) => p.enabled && p.last_status === 'healthy').length;
    const warning = projects.filter((p) => p.enabled && p.last_status === 'warning').length;
    const failed = projects.filter((p) => p.enabled && p.last_status === 'failed').length;

    const lastSuccessRun = runs.find((r) => r.status === 'success');
    const failedRuns = runs.filter((r) => r.status === 'failed').length;

    // Next Sunday 03:30 UTC calculation
    const now = new Date();
    const nextSunday = new Date(now);
    const dayDiff = (7 - now.getUTCDay()) % 7;
    nextSunday.setUTCDate(now.getUTCDate() + (dayDiff === 0 && now.getUTCHours() >= 4 ? 7 : dayDiff));
    nextSunday.setUTCHours(3, 30, 0, 0);

    const metrics: DashboardMetrics = {
      totalProjects: total,
      enabledProjects: enabled,
      healthyProjects: healthy,
      warningProjects: warning,
      failedProjects: failed,
      totalRunsCompleted: runs.filter((r) => r.status !== 'running').length,
      totalFailedRuns: failedRuns,
      lastSuccessfulRunAt: lastSuccessRun?.finished_at || null,
      nextScheduledRunAt: nextSunday.toISOString(),
      workerStatus: {
        name: cfStatus.name,
        deployed: cfStatus.deployed,
        activeCron: cfStatus.crons[0] || cron,
        timezone: tz,
        lastDeployment: deployments[0] || null,
      },
    };

    return c.json(metrics);
  });

  // =========================================================================
  // PROJECTS CRUD
  // =========================================================================
  app.get('/api/projects', async (c) => {
    const storage = getStorage(c.env);
    const provider = c.req.query('provider');
    const status = c.req.query('status');
    const enabled = c.req.query('enabled');

    let projects = await storage.getProjects();

    if (provider) {
      projects = projects.filter((p) => p.provider === provider);
    }
    if (status) {
      projects = projects.filter((p) => p.last_status === status);
    }
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      projects = projects.filter((p) => p.enabled === isEnabled);
    }

    // Mask secrets before sending to frontend
    const sanitized = projects.map((p) => ({
      ...p,
      secret_ref: maskSecret(p.secret_ref),
    }));

    return c.json(sanitized);
  });

  app.get('/api/projects/:id', async (c) => {
    const storage = getStorage(c.env);
    const id = c.req.param('id');
    const project = await storage.getProjectById(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    return c.json({
      ...project,
      secret_ref: maskSecret(project.secret_ref),
    });
  });

  app.post('/api/projects', async (c) => {
    const storage = getStorage(c.env);
    const body = await c.req.json();
    const parse = createProjectSchema.safeParse(body);
    if (!parse.success) {
      return c.json({ error: 'Validation failed', details: parse.error.format() }, 400);
    }

    const { auth_value, ...projectData } = parse.data;

    // SSRF pre-validation
    const ssrf = validateUrlForSSRF(projectData.base_url, c.env?.ENVIRONMENT === 'development');
    if (!ssrf.valid) {
      return c.json({ error: `SSRF Violation: ${ssrf.error}` }, 400);
    }

    // Use auth_value as secret_ref if provided
    const secretRef = auth_value || projectData.secret_ref || null;

    const created = await storage.createProject({
      ...projectData,
      secret_ref: secretRef,
      last_status: 'unknown',
    });

    await storage.logActivity({
      action: 'project.create',
      resource_type: 'project',
      resource_id: created.id,
      outcome: 'success',
      metadata: { name: created.name, provider: created.provider },
    });

    return c.json({
      ...created,
      secret_ref: maskSecret(created.secret_ref),
    }, 201);
  });

  app.patch('/api/projects/:id', async (c) => {
    const storage = getStorage(c.env);
    const id = c.req.param('id');
    const body = await c.req.json();
    const parse = updateProjectSchema.safeParse(body);
    if (!parse.success) {
      return c.json({ error: 'Validation failed', details: parse.error.format() }, 400);
    }

    const existing = await storage.getProjectById(id);
    if (!existing) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const { auth_value, ...updateData } = parse.data;

    if (updateData.base_url) {
      const ssrf = validateUrlForSSRF(updateData.base_url, c.env?.ENVIRONMENT === 'development');
      if (!ssrf.valid) {
        return c.json({ error: `SSRF Violation: ${ssrf.error}` }, 400);
      }
    }

    // Only update secret if a new non-empty auth_value was passed
    if (auth_value !== undefined && auth_value !== '') {
      updateData.secret_ref = auth_value;
    }

    const updated = await storage.updateProject(id, updateData);

    await storage.logActivity({
      action: 'project.update',
      resource_type: 'project',
      resource_id: id,
      outcome: 'success',
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return c.json({
      ...updated,
      secret_ref: maskSecret(updated.secret_ref),
    });
  });

  app.delete('/api/projects/:id', async (c) => {
    const storage = getStorage(c.env);
    const id = c.req.param('id');
    const project = await storage.getProjectById(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const deleted = await storage.deleteProject(id);
    if (deleted) {
      await storage.logActivity({
        action: 'project.delete',
        resource_type: 'project',
        resource_id: id,
        outcome: 'success',
        metadata: { name: project.name },
      });
      return c.json({ success: true, message: 'Project deleted' });
    }
    return c.json({ error: 'Failed to delete project' }, 500);
  });

  // =========================================================================
  // ENDPOINT TESTING (MANUAL TEST & DRAFT TEST)
  // =========================================================================
  app.post('/api/projects/:id/test', async (c) => {
    const storage = getStorage(c.env);
    const id = c.req.param('id');
    const project = await storage.getProjectById(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const connector = getConnector(project.provider);
    const result = await connector.execute(project, project.secret_ref || undefined, {
      allowHttp: c.env?.ENVIRONMENT === 'development',
    });

    await storage.logActivity({
      action: 'endpoint.manual_test',
      resource_type: 'project',
      resource_id: id,
      outcome: result.status === 'success' ? 'success' : 'failed',
      metadata: {
        http_status: result.httpStatus,
        response_time_ms: result.responseTimeMs,
        status: result.status,
      },
    });

    return c.json({
      success: result.status === 'success',
      status: result.status,
      http_status: result.httpStatus,
      response_time_ms: result.responseTimeMs,
      retry_attempts: 0,
      headers: result.headers,
      error: result.error ? sanitizeErrorMessage(result.error) : undefined,
      message: result.message,
    });
  });

  app.post('/api/projects/test-draft', async (c) => {
    const body = await c.req.json();
    const parse = endpointTestSchema.safeParse(body);
    if (!parse.success) {
      return c.json({ error: 'Validation failed', details: parse.error.format() }, 400);
    }

    const data = parse.data;
    const connector = getConnector(data.provider);

    // Mock project structure for test execution
    const tempProject: any = {
      id: 'draft-test',
      name: 'Draft Test',
      provider: data.provider,
      base_url: data.base_url,
      endpoint_path: data.endpoint_path,
      http_method: data.http_method,
      auth_type: data.auth_type,
      custom_headers: data.custom_headers || {},
      expected_status_codes: data.expected_status_codes || [200],
      timeout_ms: data.timeout_ms || 10000,
    };

    const result = await connector.execute(tempProject, data.auth_value, {
      allowHttp: c.env?.ENVIRONMENT === 'development',
    });

    return c.json({
      success: result.status === 'success',
      status: result.status,
      http_status: result.httpStatus,
      response_time_ms: result.responseTimeMs,
      retry_attempts: 0,
      headers: result.headers,
      error: result.error ? sanitizeErrorMessage(result.error) : undefined,
      message: result.message,
    });
  });

  // =========================================================================
  // HEARTBEAT RUNS (JOBS)
  // =========================================================================
  app.post('/api/heartbeat/run', async (c) => {
    const storage = getStorage(c.env);
    const summary = await executeHeartbeatBatch(storage, {
      triggerType: 'manual',
      allowHttp: c.env?.ENVIRONMENT === 'development',
    });

    return c.json(summary);
  });

  app.get('/api/jobs', async (c) => {
    const storage = getStorage(c.env);
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const runs = await storage.getRuns(limit);
    return c.json(runs);
  });

  app.get('/api/jobs/:id', async (c) => {
    const storage = getStorage(c.env);
    const id = c.req.param('id');
    const run = await storage.getRunById(id);
    if (!run) {
      return c.json({ error: 'Job not found' }, 404);
    }
    return c.json(run);
  });

  // =========================================================================
  // ACTIVITY & AUDIT LOGS
  // =========================================================================
  app.get('/api/activity', async (c) => {
    const storage = getStorage(c.env);
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const logs = await storage.getActivityLogs(limit);
    return c.json(logs);
  });

  // =========================================================================
  // SCHEDULES & WORKER DEPLOYMENT
  // =========================================================================
  app.get('/api/schedules', async (c) => {
    const storage = getStorage(c.env);
    const schedules = await storage.getSchedules();
    return c.json(schedules);
  });

  app.put('/api/schedules/:id', async (c) => {
    const storage = getStorage(c.env);
    const id = c.req.param('id');
    const body = await c.req.json();
    const parse = scheduleUpdateSchema.safeParse(body);
    if (!parse.success) {
      return c.json({ error: 'Invalid schedule parameters', details: parse.error.format() }, 400);
    }

    const { cron_expression, timezone } = parse.data;

    // Validate cron expression
    if (!cronExpressionRegex.test(cron_expression)) {
      return c.json({ error: 'Invalid 5-part cron expression (e.g. "30 3 * * SUN")' }, 400);
    }

    const updated = await storage.updateSchedule(id, {
      cron_expression,
      timezone,
    });

    // Automatically sync with Cloudflare worker
    const cfService = new CloudflareService({
      apiToken: c.env?.CLOUDFLARE_API_TOKEN,
      accountId: c.env?.CLOUDFLARE_ACCOUNT_ID,
      workerName: c.env?.WORKER_NAME || 'heartbeat-engine',
    });

    const deployResult = await cfService.syncCronSchedule(cron_expression, storage);

    return c.json({
      schedule: updated,
      deployment: deployResult.deployment,
      message: 'Schedule updated and synced to Cloudflare worker trigger',
    });
  });

  app.get('/api/worker/status', async (c) => {
    const storage = getStorage(c.env);
    const schedules = await storage.getSchedules();
    const activeCron = schedules[0]?.cron_expression || DEFAULT_CRON_EXPRESSION;

    const cfService = new CloudflareService({
      apiToken: c.env?.CLOUDFLARE_API_TOKEN,
      accountId: c.env?.CLOUDFLARE_ACCOUNT_ID,
      workerName: c.env?.WORKER_NAME || 'heartbeat-engine',
    });

    const status = await cfService.getWorkerStatus(activeCron);
    const deployments = await storage.getDeployments(5);

    return c.json({
      ...status,
      recentDeployments: deployments,
    });
  });

  app.post('/api/worker/deploy', async (c) => {
    const storage = getStorage(c.env);
    const schedules = await storage.getSchedules();
    const cron = schedules[0]?.cron_expression || DEFAULT_CRON_EXPRESSION;

    const cfService = new CloudflareService({
      apiToken: c.env?.CLOUDFLARE_API_TOKEN,
      accountId: c.env?.CLOUDFLARE_ACCOUNT_ID,
      workerName: c.env?.WORKER_NAME || 'heartbeat-engine',
    });

    const result = await cfService.syncCronSchedule(cron, storage);
    return c.json(result);
  });

  app.get('/api/worker/deployments', async (c) => {
    const storage = getStorage(c.env);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const deployments = await storage.getDeployments(limit);
    return c.json(deployments);
  });

  // =========================================================================
  // NOTIFICATIONS & EMAIL REPORTING
  // =========================================================================
  app.get('/api/notifications/config', async (c) => {
    const storage = getStorage(c.env);
    const config = await storage.getEmailConfig();
    return c.json({
      ...config,
      api_key: maskSecret(config.api_key),
    });
  });

  app.post('/api/notifications/config', async (c) => {
    const storage = getStorage(c.env);
    const body = await c.req.json();
    const existing = await storage.getEmailConfig();

    const updateData = { ...body };
    if (!updateData.api_key || updateData.api_key.includes('****')) {
      updateData.api_key = existing.api_key;
    }

    const updated = await storage.updateEmailConfig(updateData);
    return c.json({
      ...updated,
      api_key: maskSecret(updated.api_key),
      message: 'Email configuration saved successfully',
    });
  });

  app.post('/api/notifications/test-email', async (c) => {
    const storage = getStorage(c.env);
    const body = await c.req.json();
    const existing = await storage.getEmailConfig();

    const testConfig = {
      ...existing,
      ...body,
      api_key: body.api_key && !body.api_key.includes('****') ? body.api_key : existing.api_key,
    };

    const emailService = new EmailService(testConfig);
    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #ffffff; color: #0f172a; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #10b981; margin-top: 0; font-size: 18px;">ServerXHeartBeat • Test Email</h2>
        <p style="font-size: 13px; color: #334155; line-height: 1.5;">This is a test notification confirming your email alerting configuration is active and working properly.</p>
        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 12px; font-family: monospace; border: 1px solid #e2e8f0; margin: 16px 0;">
          <div>Provider: ${testConfig.provider.toUpperCase()}</div>
          <div>From: ${testConfig.from_email}</div>
          <div>To: ${testConfig.to_emails?.join(', ') || 'None'}</div>
          <div>Time: ${new Date().toISOString()}</div>
        </div>
        <p style="font-size: 11px; color: #64748b; margin-bottom: 0;">ServerXHeartBeat • Cloud Infrastructure Monitoring</p>
      </div>
    `;

    const res = await emailService.sendReport(
      '[ServerXHeartBeat] Test Notification',
      testHtml
    );

    return c.json(res);
  });

  // Client-side SPA fallback for non-API routes
  app.get('*', (c) => {
    const p = c.req.path;
    if (p.startsWith('/api') || p === '/health') {
      return c.notFound();
    }
    return c.html(UI_BUNDLE.html, 200, {
      'Content-Type': 'text/html; charset=utf-8',
    });
  });

  return app;
}
