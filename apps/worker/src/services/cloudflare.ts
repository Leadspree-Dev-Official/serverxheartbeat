import { WorkerDeployment } from '@heartbeat/shared';
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

export class CloudflareService {
  constructor(private config: CloudflareConfig) {}

  /**
   * Fetches current script details and cron triggers from Cloudflare
   */
  async getWorkerStatus(activeCron: string): Promise<{
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
        crons: [activeCron],
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
          crons: [activeCron],
          isConfigured: true,
        };
      }

      const data: any = await res.json();
      const crons = data?.result?.schedules?.map((s: any) => s.cron) || [activeCron];

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
        crons: [activeCron],
        isConfigured: true,
      };
    }
  }

  /**
   * Updates Cron Trigger schedule on the Cloudflare Worker script
   */
  async syncCronSchedule(
    cronExpression: string,
    storage: StorageAdapter,
    version: string = 'v1.0.0'
  ): Promise<WorkerDeploymentResult> {
    const workerName = this.config.workerName || 'heartbeat-engine';
    const startedAt = new Date().toISOString();

    const deployment = await storage.createDeployment({
      worker_name: workerName,
      version,
      status: 'pending',
      started_at: startedAt,
      cron_schedule: cronExpression,
    });

    const { apiToken, accountId } = this.config;

    // Local dev simulation if token or account ID is not configured
    if (!apiToken || !accountId) {
      // Simulate deployment delay
      await new Promise((r) => setTimeout(r, 600));

      const updated = await storage.updateDeployment(deployment.id, {
        status: 'successful',
        finished_at: new Date().toISOString(),
      });

      await storage.logActivity({
        action: 'worker.cron_sync',
        resource_type: 'worker_deployment',
        resource_id: deployment.id,
        outcome: 'success',
        metadata: {
          cron_schedule: cronExpression,
          note: 'Configured in local simulation mode (Cloudflare API token not set)',
        },
      });

      return {
        success: true,
        deployment: updated,
        details: { mode: 'simulation', cron: cronExpression },
      };
    }

    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/schedules`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{ cron: cronExpression }]),
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
          metadata: { error: errorMsg },
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
        metadata: { cron_schedule: cronExpression },
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
}
