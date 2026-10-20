import { Project, HeartbeatRun, HeartbeatResult, TriggerType, RunStatus, ResultStatus } from '@heartbeat/shared';
import { getConnector } from './connectors';
import { executeWithRetry } from './retry';
import { sanitizeErrorMessage } from '../services/crypto';
import { StorageAdapter } from '../services/supabase';
import { EmailService } from '../services/email';

export interface BatchRunOptions {
  triggerType: TriggerType;
  allowHttp?: boolean;
  concurrency?: number;
}

export interface RunSummary {
  run: HeartbeatRun;
  results: HeartbeatResult[];
}

/**
 * Executes health checks for all enabled projects in controlled batches
 */
export async function executeHeartbeatBatch(
  storage: StorageAdapter,
  options: BatchRunOptions
): Promise<RunSummary> {
  const { triggerType, allowHttp = false, concurrency = 5 } = options;

  // 1. Retrieve all enabled projects
  const projects = await storage.getProjects(true);

  // 2. Initialize run record in running state
  const run = await storage.createRun({
    trigger_type: triggerType,
    total_projects: projects.length,
    status: 'running',
    started_at: new Date().toISOString(),
  });

  if (projects.length === 0) {
    const finishedRun = await storage.updateRun(run.id, {
      finished_at: new Date().toISOString(),
      status: 'success',
      total_projects: 0,
      successful_count: 0,
      failed_count: 0,
      skipped_count: 0,
      error_summary: 'No enabled projects configured for execution',
    });
    return { run: finishedRun, results: [] };
  }

  const results: HeartbeatResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  // 3. Process projects in controlled concurrent batches
  const queue = [...projects];

  async function processProject(project: Project): Promise<void> {
    const connector = getConnector(project.provider);
    const retryCount = project.retry_count ?? 2;

    // Execute with bounded retries for 5xx errors or network timeouts
    const { result, error, attempts } = await executeWithRetry(
      async () => {
        return await connector.execute(project, project.secret_ref || undefined, {
          allowHttp,
          userAgent: 'HeartbeatManager/1.0',
        });
      },
      {
        maxRetries: retryCount,
        initialDelayMs: 400,
        maxDelayMs: 3000,
      },
      (err, res) => {
        // Retry if network error or 5xx server error
        if (err) return true;
        if (res && res.httpStatus && res.httpStatus >= 500) return true;
        return false;
      }
    );

    const checkResult = result || {
      status: 'failed' as ResultStatus,
      responseTimeMs: 0,
      error: sanitizeErrorMessage(error),
      message: 'Check failed after retries',
    };

    const isSuccessful = checkResult.status === 'success';
    if (isSuccessful) {
      successCount++;
    } else {
      failedCount++;
    }

    // Record individual project result
    const createdResult = await storage.createResult({
      run_id: run.id,
      project_id: project.id,
      project_name: project.name,
      provider: project.provider,
      http_status: checkResult.httpStatus || null,
      response_time_ms: checkResult.responseTimeMs,
      retry_attempts: attempts,
      status: checkResult.status,
      error_summary: checkResult.error ? sanitizeErrorMessage(checkResult.error) : null,
    });
    results.push(createdResult);

    // Update project state
    const updateData: Partial<Project> = {
      last_checked_at: new Date().toISOString(),
      last_status: checkResult.status === 'success' ? 'healthy' : (checkResult.status === 'warning' ? 'warning' : 'failed'),
      last_response_time_ms: checkResult.responseTimeMs,
      last_error: checkResult.error ? sanitizeErrorMessage(checkResult.error) : null,
    };

    if (isSuccessful) {
      updateData.last_successful_at = new Date().toISOString();
    }

    try {
      await storage.updateProject(project.id, updateData);
    } catch (updateErr) {
      console.error(`Failed to update project ${project.id} metadata:`, updateErr);
    }
  }

  // Pool execution with bounded concurrency
  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item) {
            await processProject(item);
          }
        }
      })()
    );
  }

  await Promise.all(workers);

  // 4. Calculate overall run outcome
  let finalStatus: RunStatus = 'success';
  if (failedCount > 0 && successCount > 0) {
    finalStatus = 'partial';
  } else if (failedCount > 0 && successCount === 0) {
    finalStatus = 'failed';
  }

  const finishedRun = await storage.updateRun(run.id, {
    finished_at: new Date().toISOString(),
    successful_count: successCount,
    failed_count: failedCount,
    status: finalStatus,
    error_summary: failedCount > 0 ? `${failedCount} of ${projects.length} endpoints failed health check` : null,
  });

  // Log activity
  await storage.logActivity({
    action: triggerType === 'scheduled' ? 'heartbeat.scheduled_run' : 'heartbeat.manual_run',
    resource_type: 'heartbeat_run',
    resource_id: run.id,
    outcome: finalStatus === 'failed' ? 'failed' : 'success',
    metadata: {
      total: projects.length,
      successful: successCount,
      failed: failedCount,
      status: finalStatus,
    },
  });

  // 5. Email Report Dispatch (if enabled in UI settings)
  try {
    const emailConfig = await storage.getEmailConfig();
    if (emailConfig.enabled) {
      const shouldSend =
        (emailConfig.notify_on_scheduled_summary && triggerType === 'scheduled') ||
        (emailConfig.notify_on_failure && failedCount > 0);

      if (shouldSend) {
        const emailService = new EmailService(emailConfig);
        const subject = `[Heartbeat ${finalStatus.toUpperCase()}] ${
          failedCount > 0 ? `${failedCount} Failed` : 'All Healthy'
        } (${projects.length} endpoints checked)`;
        const html = emailService.generateHtmlReport(finishedRun, results);
        const sendRes = await emailService.sendReport(subject, html);

        await storage.logActivity({
          action: 'notification.email_report',
          resource_type: 'email',
          resource_id: run.id,
          outcome: sendRes.success ? 'success' : 'failed',
          metadata: {
            recipients: emailConfig.to_emails,
            messageId: sendRes.messageId,
            error: sendRes.error,
          },
        });
      }
    }
  } catch (emailErr) {
    console.error('Failed to dispatch heartbeat email report:', emailErr);
  }

  return { run: finishedRun, results };
}
