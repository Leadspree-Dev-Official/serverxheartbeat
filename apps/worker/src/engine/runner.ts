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
  forceAll?: boolean;
  projectId?: string;
  now?: Date;
}

export interface RunSummary {
  run: HeartbeatRun;
  results: HeartbeatResult[];
}

/**
 * Checks if an individual project is due for execution at the given timestamp
 * based on its configured days, hours, minutes, and timezone.
 */
export function isProjectDue(project: Project, now: Date = new Date()): boolean {
  if (!project.enabled) return false;

  const tz = project.schedule_timezone || 'Asia/Kolkata';

  let currentDay = '';
  let currentHour = 0;
  let currentMinute = 0;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(now);
    for (const p of parts) {
      if (p.type === 'weekday') currentDay = p.value.toUpperCase();
      if (p.type === 'hour') currentHour = parseInt(p.value, 10);
      if (p.type === 'minute') currentMinute = parseInt(p.value, 10);
    }
  } catch {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    currentDay = days[now.getUTCDay()];
    currentHour = now.getUTCHours();
    currentMinute = now.getUTCMinutes();
  }

  // 1. Day of week match
  const configuredDays =
    project.schedule_days && project.schedule_days.length > 0
      ? project.schedule_days.map((d) => d.toUpperCase())
      : ['SUN'];

  if (configuredDays.length < 7 && !configuredDays.includes(currentDay)) {
    return false;
  }

  // 2. Hour match
  const configuredHours =
    project.schedule_hours && project.schedule_hours.length > 0
      ? project.schedule_hours
      : [9];

  if (!configuredHours.includes(currentHour)) {
    return false;
  }

  // 3. Minute slot match: 15-minute window for edge runner ticks (:00, :15, :30, :45)
  const scheduledMinute = project.schedule_minutes ?? 0;
  const diffMinutes = currentMinute - scheduledMinute;
  if (diffMinutes < 0 || diffMinutes >= 15) {
    return false;
  }

  // 4. Duplicate prevention: Don't re-execute if already checked in the last 20 minutes
  if (project.last_checked_at) {
    const elapsedMs = now.getTime() - new Date(project.last_checked_at).getTime();
    if (elapsedMs < 20 * 60 * 1000) {
      return false;
    }
  }

  return true;
}

/**
 * Executes health checks for due projects (or all projects if manual) in controlled batches
 */
export async function executeHeartbeatBatch(
  storage: StorageAdapter,
  options: BatchRunOptions
): Promise<RunSummary> {
  const { triggerType, allowHttp = false, concurrency = 5, forceAll = false } = options;

  // 1. Retrieve all enabled projects
  const allProjects = await storage.getProjects(true);

  // 2. Filter projects based on project-wise schedule or manual force
  let targetProjects = allProjects;
  if (options.projectId) {
    targetProjects = allProjects.filter((p) => p.id === options.projectId);
  } else if (triggerType === 'scheduled' && !forceAll) {
    const checkTime = options.now || new Date();
    targetProjects = allProjects.filter((p) => isProjectDue(p, checkTime));
  }

  // If this is a scheduled tick and NO projects are due right now, exit quietly without cluttering job history
  if (triggerType === 'scheduled' && targetProjects.length === 0) {
    return {
      run: {
        id: 'no-op',
        trigger_type: 'scheduled',
        total_projects: 0,
        successful_count: 0,
        failed_count: 0,
        skipped_count: allProjects.length,
        status: 'success',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      results: [],
    };
  }

  // 3. Initialize run record in running state for due projects
  const run = await storage.createRun({
    trigger_type: triggerType,
    total_projects: targetProjects.length,
    status: 'running',
    started_at: new Date().toISOString(),
  });

  if (targetProjects.length === 0) {
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

  const pendingResults: Partial<HeartbeatResult>[] = [];
  const projectUpdates: Array<{ id: string; data: Partial<Project> }> = [];
  let successCount = 0;
  let failedCount = 0;

  // 4. Process due projects in controlled concurrent batches
  const queue = [...targetProjects];

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

    // Stage individual project result for atomic batch commit
    pendingResults.push({
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

    // Stage project state update
    const updateData: Partial<Project> = {
      last_checked_at: new Date().toISOString(),
      last_status: checkResult.status === 'success' ? 'healthy' : (checkResult.status === 'warning' ? 'warning' : 'failed'),
      last_response_time_ms: checkResult.responseTimeMs,
      last_error: checkResult.error ? sanitizeErrorMessage(checkResult.error) : null,
    };

    if (isSuccessful) {
      updateData.last_successful_at = new Date().toISOString();
    }

    projectUpdates.push({ id: project.id, data: updateData });
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

  // 5. Atomic Batch Commit (avoids race condition data loss across KV / storage)
  let results: HeartbeatResult[] = [];
  if (storage.createResults) {
    results = await storage.createResults(pendingResults);
  } else {
    for (const res of pendingResults) {
      const created = await storage.createResult(res);
      results.push(created);
    }
  }

  if (storage.updateProjectsBatch) {
    await storage.updateProjectsBatch(projectUpdates);
  } else {
    for (const update of projectUpdates) {
      try {
        await storage.updateProject(update.id, update.data);
      } catch (updateErr) {
        console.error(`Failed to update project ${update.id} metadata:`, updateErr);
      }
    }
  }

  // 6. Calculate overall run outcome
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
    error_summary: failedCount > 0 ? `${failedCount} of ${targetProjects.length} endpoints failed health check` : null,
  });

  // Log activity
  await storage.logActivity({
    action: triggerType === 'scheduled' ? 'heartbeat.scheduled_run' : 'heartbeat.manual_run',
    resource_type: 'heartbeat_run',
    resource_id: run.id,
    outcome: finalStatus === 'failed' ? 'failed' : 'success',
    metadata: {
      total: targetProjects.length,
      successful: successCount,
      failed: failedCount,
      status: finalStatus,
    },
  });

  // 7. Email Report Dispatch (if enabled in UI settings)
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
        } (${targetProjects.length} endpoints checked)`;
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
