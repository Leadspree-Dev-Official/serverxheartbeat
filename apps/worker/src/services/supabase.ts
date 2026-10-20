import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Project, HeartbeatRun, HeartbeatResult, ActivityLog, WorkerDeployment, Schedule } from '@heartbeat/shared';

export interface StorageAdapter {
  getProjects(enabledOnly?: boolean): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | null>;
  createProject(data: Partial<Project>): Promise<Project>;
  updateProject(id: string, data: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<boolean>;

  getSchedules(): Promise<Schedule[]>;
  getScheduleById(id: string): Promise<Schedule | null>;
  updateSchedule(id: string, data: Partial<Schedule>): Promise<Schedule>;

  createRun(data: Partial<HeartbeatRun>): Promise<HeartbeatRun>;
  updateRun(id: string, data: Partial<HeartbeatRun>): Promise<HeartbeatRun>;
  getRuns(limit?: number): Promise<HeartbeatRun[]>;
  getRunById(id: string): Promise<HeartbeatRun | null>;

  createResult(data: Partial<HeartbeatResult>): Promise<HeartbeatResult>;
  getResultsForRun(runId: string): Promise<HeartbeatResult[]>;

  logActivity(data: Partial<ActivityLog>): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;

  createDeployment(data: Partial<WorkerDeployment>): Promise<WorkerDeployment>;
  updateDeployment(id: string, data: Partial<WorkerDeployment>): Promise<WorkerDeployment>;
  getDeployments(limit?: number): Promise<WorkerDeployment[]>;
}

// In-Memory fallback store for local development or when Supabase keys are not set
class InMemoryStore implements StorageAdapter {
  private projects: Project[] = [
    {
      id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
      name: 'E-Commerce Backend (Supabase)',
      provider: 'supabase',
      environment: 'production',
      base_url: 'https://xyzcompany.supabase.co',
      endpoint_path: '/rest/v1/',
      http_method: 'GET',
      auth_type: 'api_key',
      secret_ref: 'sbp_mock_token_123',
      expected_status_codes: [200, 204],
      timeout_ms: 10000,
      retry_count: 2,
      schedule_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      enabled: true,
      last_checked_at: new Date(Date.now() - 3600000).toISOString(),
      last_successful_at: new Date(Date.now() - 3600000).toISOString(),
      last_status: 'healthy',
      last_response_time_ms: 142,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
      name: 'Mobile Auth & Storage (Appwrite)',
      provider: 'appwrite',
      environment: 'production',
      base_url: 'https://cloud.appwrite.io',
      endpoint_path: '/v1/health',
      http_method: 'GET',
      auth_type: 'none',
      expected_status_codes: [200],
      timeout_ms: 10000,
      retry_count: 2,
      schedule_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      enabled: true,
      last_checked_at: new Date(Date.now() - 7200000).toISOString(),
      last_successful_at: new Date(Date.now() - 7200000).toISOString(),
      last_status: 'healthy',
      last_response_time_ms: 215,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44',
      name: 'Notification Microservice (Generic)',
      provider: 'generic',
      environment: 'staging',
      base_url: 'https://httpbin.org',
      endpoint_path: '/status/200',
      http_method: 'GET',
      auth_type: 'none',
      expected_status_codes: [200],
      timeout_ms: 8000,
      retry_count: 2,
      schedule_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      enabled: true,
      last_checked_at: new Date(Date.now() - 14400000).toISOString(),
      last_successful_at: new Date(Date.now() - 14400000).toISOString(),
      last_status: 'healthy',
      last_response_time_ms: 340,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  private schedules: Schedule[] = [
    {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Default Weekly Sunday Run',
      cron_expression: '30 3 * * SUN',
      timezone: 'Asia/Kolkata',
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  private runs: HeartbeatRun[] = [
    {
      id: 'r1eebc99-9c0b-4ef8-bb6d-6bb9bd380f11',
      trigger_type: 'scheduled',
      started_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      finished_at: new Date(Date.now() - 86400000 * 7 + 4200).toISOString(),
      total_projects: 3,
      successful_count: 3,
      failed_count: 0,
      skipped_count: 0,
      status: 'success',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
  ];

  private results: HeartbeatResult[] = [
    {
      id: 'res-1',
      run_id: 'r1eebc99-9c0b-4ef8-bb6d-6bb9bd380f11',
      project_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
      project_name: 'E-Commerce Backend (Supabase)',
      provider: 'supabase',
      checked_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      http_status: 200,
      response_time_ms: 142,
      retry_attempts: 0,
      status: 'success',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
  ];

  private activity: ActivityLog[] = [
    {
      id: 'act-1',
      action: 'system.bootstrap',
      resource_type: 'system',
      outcome: 'success',
      metadata: { message: 'Heartbeat Manager initialized with default Sunday cron schedule' },
      created_at: new Date().toISOString(),
    },
  ];

  private deployments: WorkerDeployment[] = [
    {
      id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55',
      worker_name: 'heartbeat-engine',
      version: 'v1.0.0',
      status: 'successful',
      started_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      finished_at: new Date(Date.now() - 86400000 * 2 + 12000).toISOString(),
      cron_schedule: '30 3 * * SUN',
    },
  ];

  async getProjects(enabledOnly = false): Promise<Project[]> {
    if (enabledOnly) {
      return this.projects.filter((p) => p.enabled);
    }
    return [...this.projects];
  }

  async getProjectById(id: string): Promise<Project | null> {
    return this.projects.find((p) => p.id === id) || null;
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const project: Project = {
      id: crypto.randomUUID(),
      name: data.name || 'Unnamed Project',
      provider: data.provider || 'generic',
      environment: data.environment || 'production',
      base_url: data.base_url || '',
      endpoint_path: data.endpoint_path || '',
      http_method: data.http_method || 'GET',
      auth_type: data.auth_type || 'none',
      secret_ref: data.secret_ref || null,
      custom_headers: data.custom_headers || {},
      expected_status_codes: data.expected_status_codes || [200],
      timeout_ms: data.timeout_ms || 10000,
      retry_count: data.retry_count || 2,
      schedule_id: data.schedule_id || this.schedules[0]?.id || null,
      cron_expression: data.cron_expression || '30 3 * * SUN',
      schedule_timezone: data.schedule_timezone || 'Asia/Kolkata',
      schedule_days: data.schedule_days || ['SUN'],
      schedule_hours: data.schedule_hours || [9],
      schedule_minutes: data.schedule_minutes ?? 0,
      enabled: data.enabled ?? true,
      last_status: 'unknown',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.projects.push(project);
    return project;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project ${id} not found`);
    this.projects[idx] = {
      ...this.projects[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return this.projects[idx];
  }

  async deleteProject(id: string): Promise<boolean> {
    const initialLen = this.projects.length;
    this.projects = this.projects.filter((p) => p.id !== id);
    return this.projects.length < initialLen;
  }

  async getSchedules(): Promise<Schedule[]> {
    return [...this.schedules];
  }

  async getScheduleById(id: string): Promise<Schedule | null> {
    return this.schedules.find((s) => s.id === id) || null;
  }

  async updateSchedule(id: string, data: Partial<Schedule>): Promise<Schedule> {
    const idx = this.schedules.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Schedule ${id} not found`);
    this.schedules[idx] = {
      ...this.schedules[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return this.schedules[idx];
  }

  async createRun(data: Partial<HeartbeatRun>): Promise<HeartbeatRun> {
    const run: HeartbeatRun = {
      id: crypto.randomUUID(),
      trigger_type: data.trigger_type || 'manual',
      started_at: new Date().toISOString(),
      total_projects: data.total_projects || 0,
      successful_count: data.successful_count || 0,
      failed_count: data.failed_count || 0,
      skipped_count: data.skipped_count || 0,
      status: data.status || 'running',
      error_summary: data.error_summary || null,
      created_at: new Date().toISOString(),
    };
    this.runs.unshift(run);
    return run;
  }

  async updateRun(id: string, data: Partial<HeartbeatRun>): Promise<HeartbeatRun> {
    const idx = this.runs.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Run ${id} not found`);
    this.runs[idx] = { ...this.runs[idx], ...data };
    return this.runs[idx];
  }

  async getRuns(limit = 50): Promise<HeartbeatRun[]> {
    return this.runs.slice(0, limit);
  }

  async getRunById(id: string): Promise<HeartbeatRun | null> {
    const run = this.runs.find((r) => r.id === id);
    if (!run) return null;
    const results = this.results.filter((res) => res.run_id === id);
    return { ...run, results };
  }

  async createResult(data: Partial<HeartbeatResult>): Promise<HeartbeatResult> {
    const res: HeartbeatResult = {
      id: crypto.randomUUID(),
      run_id: data.run_id!,
      project_id: data.project_id!,
      project_name: data.project_name,
      provider: data.provider,
      checked_at: new Date().toISOString(),
      http_status: data.http_status,
      response_time_ms: data.response_time_ms || 0,
      retry_attempts: data.retry_attempts || 0,
      status: data.status || 'failed',
      error_summary: data.error_summary || null,
      created_at: new Date().toISOString(),
    };
    this.results.push(res);
    return res;
  }

  async getResultsForRun(runId: string): Promise<HeartbeatResult[]> {
    return this.results.filter((res) => res.run_id === runId);
  }

  async logActivity(data: Partial<ActivityLog>): Promise<ActivityLog> {
    const act: ActivityLog = {
      id: crypto.randomUUID(),
      actor_id: data.actor_id || null,
      actor_email: data.actor_email || 'admin@heartbeat.local',
      action: data.action || 'unknown',
      resource_type: data.resource_type || 'system',
      resource_id: data.resource_id || null,
      outcome: data.outcome || 'success',
      metadata: data.metadata || {},
      created_at: new Date().toISOString(),
    };
    this.activity.unshift(act);
    return act;
  }

  async getActivityLogs(limit = 50): Promise<ActivityLog[]> {
    return this.activity.slice(0, limit);
  }

  async createDeployment(data: Partial<WorkerDeployment>): Promise<WorkerDeployment> {
    const dep: WorkerDeployment = {
      id: crypto.randomUUID(),
      worker_name: data.worker_name || 'heartbeat-engine',
      version: data.version || 'v1.0.0',
      status: data.status || 'pending',
      initiated_by: data.initiated_by || null,
      started_at: new Date().toISOString(),
      cron_schedule: data.cron_schedule || '30 3 * * SUN',
      error_summary: data.error_summary || null,
    };
    this.deployments.unshift(dep);
    return dep;
  }

  async updateDeployment(id: string, data: Partial<WorkerDeployment>): Promise<WorkerDeployment> {
    const idx = this.deployments.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error(`Deployment ${id} not found`);
    this.deployments[idx] = { ...this.deployments[idx], ...data };
    return this.deployments[idx];
  }

  async getDeployments(limit = 20): Promise<WorkerDeployment[]> {
    return this.deployments.slice(0, limit);
  }
}

// PostgreSQL Supabase Adapter
class SupabaseStore implements StorageAdapter {
  constructor(private client: SupabaseClient) {}

  async getProjects(enabledOnly = false): Promise<Project[]> {
    let query = this.client.from('projects').select('*').order('created_at', { ascending: false });
    if (enabledOnly) {
      query = query.eq('enabled', true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getProjectById(id: string): Promise<Project | null> {
    const { data, error } = await this.client.from('projects').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const { data: created, error } = await this.client.from('projects').insert([data]).select().single();
    if (error) throw error;
    return created;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const { data: updated, error } = await this.client.from('projects').update(data).eq('id', id).select().single();
    if (error) throw error;
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    const { error } = await this.client.from('projects').delete().eq('id', id);
    return !error;
  }

  async getSchedules(): Promise<Schedule[]> {
    const { data, error } = await this.client.from('schedules').select('*');
    if (error) throw error;
    return data || [];
  }

  async getScheduleById(id: string): Promise<Schedule | null> {
    const { data, error } = await this.client.from('schedules').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }

  async updateSchedule(id: string, data: Partial<Schedule>): Promise<Schedule> {
    const { data: updated, error } = await this.client.from('schedules').update(data).eq('id', id).select().single();
    if (error) throw error;
    return updated;
  }

  async createRun(data: Partial<HeartbeatRun>): Promise<HeartbeatRun> {
    const { data: created, error } = await this.client.from('heartbeat_runs').insert([data]).select().single();
    if (error) throw error;
    return created;
  }

  async updateRun(id: string, data: Partial<HeartbeatRun>): Promise<HeartbeatRun> {
    const { data: updated, error } = await this.client.from('heartbeat_runs').update(data).eq('id', id).select().single();
    if (error) throw error;
    return updated;
  }

  async getRuns(limit = 50): Promise<HeartbeatRun[]> {
    const { data, error } = await this.client.from('heartbeat_runs').select('*').order('started_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  async getRunById(id: string): Promise<HeartbeatRun | null> {
    const { data: run, error: runErr } = await this.client.from('heartbeat_runs').select('*').eq('id', id).single();
    if (runErr || !run) return null;

    const { data: results } = await this.client
      .from('heartbeat_results')
      .select('*, projects(name, provider)')
      .eq('run_id', id);

    const formattedResults = (results || []).map((r: any) => ({
      ...r,
      project_name: r.projects?.name,
      provider: r.projects?.provider,
    }));

    return { ...run, results: formattedResults };
  }

  async createResult(data: Partial<HeartbeatResult>): Promise<HeartbeatResult> {
    const { data: created, error } = await this.client.from('heartbeat_results').insert([data]).select().single();
    if (error) throw error;
    return created;
  }

  async getResultsForRun(runId: string): Promise<HeartbeatResult[]> {
    const { data, error } = await this.client.from('heartbeat_results').select('*').eq('run_id', runId);
    if (error) throw error;
    return data || [];
  }

  async logActivity(data: Partial<ActivityLog>): Promise<ActivityLog> {
    const { data: created, error } = await this.client.from('activity_logs').insert([data]).select().single();
    if (error) throw error;
    return created;
  }

  async getActivityLogs(limit = 50): Promise<ActivityLog[]> {
    const { data, error } = await this.client.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  async createDeployment(data: Partial<WorkerDeployment>): Promise<WorkerDeployment> {
    const { data: created, error } = await this.client.from('worker_deployments').insert([data]).select().single();
    if (error) throw error;
    return created;
  }

  async updateDeployment(id: string, data: Partial<WorkerDeployment>): Promise<WorkerDeployment> {
    const { data: updated, error } = await this.client.from('worker_deployments').update(data).eq('id', id).select().single();
    if (error) throw error;
    return updated;
  }

  async getDeployments(limit = 20): Promise<WorkerDeployment[]> {
    const { data, error } = await this.client.from('worker_deployments').select('*').order('started_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }
}

// Global in-memory instance singleton for dev persistence
const inMemorySingleton = new InMemoryStore();

export function getStorage(env?: any): StorageAdapter {
  const nodeProcess = (globalThis as any).process;
  const supabaseUrl = env?.SUPABASE_URL || nodeProcess?.env?.SUPABASE_URL;
  const supabaseKey = env?.SUPABASE_SERVICE_ROLE_KEY || env?.SUPABASE_ANON_KEY || nodeProcess?.env?.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const client = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
      return new SupabaseStore(client);
    } catch (e) {
      console.warn('Failed to initialize Supabase client, falling back to memory store:', e);
      return inMemorySingleton;
    }
  }

  return inMemorySingleton;
}
