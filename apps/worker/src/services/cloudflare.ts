import { Project, WorkerDeployment } from '@heartbeat/shared';
import { sanitizeErrorMessage } from './crypto';
import { StorageAdapter } from './supabase';

export interface CloudflareConfig {
  apiToken?: string;
  accountId?: string;
  workerName?: string;
}

export interface WorkerDeploymentResult {
  success: boolean;
  deployment: WorkerDeployment;
  error?: string;
  details?: any;
}

/**
 * Derives the optimal set of Cloudflare Cron Triggers (max 5) across all enabled projects,
 * grouping projects that share the same execution hour and minute.
 */
export function computeOptimalProjectCrons(projects: Project[]): string[] {
  const timeGroups = new Map<string, Set<string>>(); // key: "utcMin utcHour", value: Set of days
  const dayOrder = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  for (const p of projects) {
    if (!p.enabled) continue;
    const tz = p.schedule_timezone || 'Asia/Kolkata';
    const days = p.schedule_days && p.schedule_days.length > 0 ? p.schedule_days : ['SUN'];
    const hours = p.schedule_hours && p.schedule_hours.length > 0 ? p.schedule_hours : [9];
    const minute = p.schedule_minutes ?? 0;

    for (const h of hours) {
      // Convert hour and minute from target timezone to UTC
      let utcM = minute;
      let utcH = h;

      if (tz === 'Asia/Kolkata') {
        // IST is UTC+05:30
        let totalMin = h * 60 + minute - 330;
        if (totalMin < 0) totalMin += 1440;
        utcH = Math.floor(totalMin / 60);
        utcM = totalMin % 60;
      }

      const key = `${utcM} ${utcH}`;
      if (!timeGroups.has(key)) {
        timeGroups.set(key, new Set<string>());
      }
      const daySet = timeGroups.get(key)!;

      if (days.length === 7) {
        daySet.add('*');
      } else {
        for (const d of days) {
          daySet.add(d.toUpperCase());
        }
      }
    }
  }

  if (timeGroups.size === 0) {
    return ['30 3 * * SUN,WED'];
  }

  const crons: string[] = [];
  for (const [timeKey, daySet] of timeGroups.entries()) {
    let dayStr = '*';
    if (!daySet.has('*')) {
      const sortedDays = Array.from(daySet).sort(
        (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b)
      );
      dayStr = sortedDays.join(',');
    }
    crons.push(`${timeKey} * * ${dayStr}`);
  }

  // Cloudflare Free Plan limit: up to 5 cron triggers
  return crons.slice(0, 5);
}

export class CloudflareService {
  constructor(private config: CloudflareConfig) {}

  /**
   * Fetches current script details and cron triggers from Cloudflare
   */
  async getWorkerStatus(activeCron?: string): Promise<{
    deployed: boolean;
    name: string;
    environment: string;
    crons: string[];
    lastModified?: string;
    isConfigured: boolean;
  }> {
    const { apiToken, accountId, workerName = 'heartbeat-engine' } = this.config;

    if (!apiToken || !accountId) {
      return {
        deployed: true,
        name: workerName,
        environment: 'local-dev',
        crons: activeCron ? [activeCron] : ['30 3 * * SUN,WED'],
        isConfigured: false,
      };
    }

    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/schedules`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) {
        return {
          deployed: false,
          name: workerName,
          environment: 'production',
          crons: activeCron ? [activeCron] : ['30 3 * * SUN,WED'],
          isConfigured: true,
        };
      }

      const data: any = await res.json();
      const crons = data?.result?.schedules?.map((s: any) => s.cron) || (activeCron ? [activeCron] : ['30 3 * * SUN,WED']);

      return {
        deployed: true,
        name: workerName,
        environment: 'production',
        crons,
        lastModified: data?.result?.modified_on,
        isConfigured: true,
      };
    } catch {
      return {
        deployed: true,
        name: workerName,
        environment: 'production',
        crons: activeCron ? [activeCron] : ['30 3 * * SUN,WED'],
        isConfigured: true,
      };
    }
  }

  /**
   * Automatically inspects all enabled projects in KV, computes the minimal optimal
   * cron trigger expressions, and synchronizes them directly to Cloudflare's Edge Scheduler.
   */
  async syncAllProjectSchedules(
    storage: StorageAdapter,
    version: string = 'v1.0.0'
  ): Promise<WorkerDeploymentResult> {
    const projects = await storage.getProjects(true);
    const optimalCrons = computeOptimalProjectCrons(projects);
    return this.syncCronSchedules(optimalCrons, storage, version);
  }

  /**
   * Synchronizes an array of cron expressions with Cloudflare's Worker Schedules API
   */
  async syncCronSchedules(
    cronExpressions: string[],
    storage: StorageAdapter,
    version: string = 'v1.0.0'
  ): Promise<WorkerDeploymentResult> {
    const workerName = this.config.workerName || 'heartbeat-engine';
    const startedAt = new Date().toISOString();
    const joinedCron = cronExpressions.join('; ');

    const deployment = await storage.createDeployment({
      worker_name: workerName,
      version,
      status: 'pending',
      started_at: startedAt,
      cron_schedule: joinedCron,
    });

    const { apiToken, accountId } = this.config;

    // Simulation mode if token is not available
    if (!apiToken || !accountId) {
      await new Promise((r) => setTimeout(r, 400));
      const updated = await storage.updateDeployment(deployment.id, {
        status: 'successful',
        finished_at: new Date().toISOString(),
      });
      return {
        success: true,
        deployment: updated,
        details: { mode: 'simulation', crons: cronExpressions },
      };
    }

    try {
      const schedulePayload = cronExpressions.map((cron) => ({ cron }));

      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/schedules`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(schedulePayload),
        }
      );

      const data: any = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = sanitizeErrorMessage(
          data?.errors?.[0]?.message || `Cloudflare API returned status ${res.status}`
        );

        const failed = await storage.updateDeployment(deployment.id, {
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_summary: errorMsg,
        });

        await storage.logActivity({
          action: 'worker.cron_sync',
          resource_type: 'worker_deployment',
          resource_id: deployment.id,
          outcome: 'failed',
          metadata: { error: errorMsg, crons: cronExpressions },
        });

        return {
          success: false,
          deployment: failed,
          error: errorMsg,
        };
      }

      const successful = await storage.updateDeployment(deployment.id, {
        status: 'successful',
        finished_at: new Date().toISOString(),
      });

      await storage.logActivity({
        action: 'worker.cron_sync',
        resource_type: 'worker_deployment',
        resource_id: deployment.id,
        outcome: 'success',
        metadata: { crons: cronExpressions },
      });

      return {
        success: true,
        deployment: successful,
        details: data.result,
      };
    } catch (err: any) {
      const errorMsg = sanitizeErrorMessage(err);
      const failed = await storage.updateDeployment(deployment.id, {
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_summary: errorMsg,
      });

      await storage.logActivity({
        action: 'worker.cron_sync',
        resource_type: 'worker_deployment',
        resource_id: deployment.id,
        outcome: 'failed',
        metadata: { error: errorMsg },
      });

      return {
        success: false,
        deployment: failed,
        error: errorMsg,
      };
    }
  }

  /**
   * Compatibility wrapper for single cron expression sync
   */
  async syncCronSchedule(
    cronExpression: string,
    storage: StorageAdapter,
    version: string = 'v1.0.0'
  ): Promise<WorkerDeploymentResult> {
    return this.syncCronSchedules([cronExpression], storage, version);
  }
}
