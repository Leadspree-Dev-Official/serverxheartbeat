import {
  Project,
  HeartbeatRun,
  ActivityLog,
  WorkerDeployment,
  Schedule,
  DashboardMetrics,
  EndpointTestRequest,
  EndpointTestResponse,
  EmailConfig,
  SendEmailResult,
} from '@heartbeat/shared';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errData = await res.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Dashboard Metrics
  getMetrics: () => fetchJson<DashboardMetrics>('/dashboard/metrics'),

  // Projects
  getProjects: (params?: { provider?: string; status?: string; enabled?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.provider) q.set('provider', params.provider);
    if (params?.status) q.set('status', params.status);
    if (params?.enabled !== undefined) q.set('enabled', String(params.enabled));
    const query = q.toString() ? `?${q.toString()}` : '';
    return fetchJson<Project[]>(`/projects${query}`);
  },

  getProject: (id: string) => fetchJson<Project>(`/projects/${id}`),

  createProject: (data: Partial<Project> & { auth_value?: string }) =>
    fetchJson<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProject: (id: string, data: Partial<Project> & { auth_value?: string }) =>
    fetchJson<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteProject: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),

  testProject: (id: string) =>
    fetchJson<EndpointTestResponse>(`/projects/${id}/test`, {
      method: 'POST',
    }),

  testDraftProject: (data: EndpointTestRequest) =>
    fetchJson<EndpointTestResponse>('/projects/test-draft', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Heartbeat Batch Runs
  triggerManualRun: () =>
    fetchJson<{ run: HeartbeatRun; results: any[] }>('/heartbeat/run', {
      method: 'POST',
    }),

  getJobs: (limit = 50) => fetchJson<HeartbeatRun[]>(`/jobs?limit=${limit}`),

  getJob: (id: string) => fetchJson<HeartbeatRun>(`/jobs/${id}`),

  // Activity & Audit Logs
  getActivityLogs: (limit = 50) => fetchJson<ActivityLog[]>(`/activity?limit=${limit}`),

  // Worker Management & Schedules
  getSchedules: () => fetchJson<Schedule[]>('/schedules'),

  updateSchedule: (id: string, data: { cron_expression: string; timezone: string }) =>
    fetchJson<{ schedule: Schedule; deployment: WorkerDeployment; message: string }>(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getWorkerStatus: () =>
    fetchJson<{
      deployed: boolean;
      name: string;
      environment: string;
      crons: string[];
      lastModified?: string;
      isConfigured: boolean;
      recentDeployments: WorkerDeployment[];
    }>('/worker/status'),

  deployWorker: () =>
    fetchJson<{ success: boolean; deployment: WorkerDeployment; error?: string }>('/worker/deploy', {
      method: 'POST',
    }),

  syncSchedules: () =>
    fetchJson<{ success: boolean; deployment: WorkerDeployment; details?: any; error?: string }>('/worker/sync-schedules', {
      method: 'POST',
    }),

  getDeployments: (limit = 20) => fetchJson<WorkerDeployment[]>(`/worker/deployments?limit=${limit}`),

  // Email Alerts & Reports
  getEmailConfig: () => fetchJson<EmailConfig>('/notifications/config'),

  updateEmailConfig: (data: Partial<EmailConfig>) =>
    fetchJson<EmailConfig>('/notifications/config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendTestEmail: (data?: Partial<EmailConfig>) =>
    fetchJson<SendEmailResult>('/notifications/test-email', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
};
