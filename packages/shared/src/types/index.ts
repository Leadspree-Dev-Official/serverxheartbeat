export type ProviderType = 'supabase' | 'appwrite' | 'generic';
export type EnvironmentType = 'development' | 'staging' | 'production';
export type ProjectStatus = 'healthy' | 'warning' | 'failed' | 'unknown' | 'disabled';
export type HttpMethod = 'GET' | 'POST' | 'HEAD';
export type AuthType = 'none' | 'bearer' | 'api_key' | 'basic';
export type TriggerType = 'scheduled' | 'manual';
export type RunStatus = 'running' | 'success' | 'partial' | 'failed';
export type ResultStatus = 'success' | 'warning' | 'failed';
export type DeploymentStatus = 'pending' | 'successful' | 'failed';

export interface Project {
  id: string;
  name: string;
  provider: ProviderType;
  environment: EnvironmentType;
  base_url: string;
  endpoint_path: string;
  http_method: HttpMethod;
  auth_type: AuthType;
  secret_ref?: string | null;
  custom_headers?: Record<string, string>;
  expected_status_codes: number[];
  timeout_ms: number;
  retry_count: number;
  schedule_id?: string | null;
  enabled: boolean;
  last_checked_at?: string | null;
  last_successful_at?: string | null;
  last_status: ProjectStatus;
  last_response_time_ms?: number | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  name: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface HeartbeatRun {
  id: string;
  trigger_type: TriggerType;
  started_at: string;
  finished_at?: string | null;
  total_projects: number;
  successful_count: number;
  failed_count: number;
  skipped_count: number;
  status: RunStatus;
  error_summary?: string | null;
  created_at: string;
  results?: HeartbeatResult[];
}

export interface HeartbeatResult {
  id: string;
  run_id: string;
  project_id: string;
  project_name?: string;
  provider?: ProviderType;
  checked_at: string;
  http_status?: number | null;
  response_time_ms: number;
  retry_attempts: number;
  status: ResultStatus;
  error_summary?: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  outcome: 'success' | 'failed';
  metadata: Record<string, any>;
  created_at: string;
}

export interface WorkerDeployment {
  id: string;
  worker_name: string;
  version?: string | null;
  status: DeploymentStatus;
  initiated_by?: string | null;
  started_at: string;
  finished_at?: string | null;
  cron_schedule: string;
  error_summary?: string | null;
}

export interface EndpointTestRequest {
  provider: ProviderType;
  base_url: string;
  endpoint_path: string;
  http_method: HttpMethod;
  auth_type: AuthType;
  auth_value?: string;
  custom_headers?: Record<string, string>;
  expected_status_codes: number[];
  timeout_ms: number;
}

export interface EndpointTestResponse {
  success: boolean;
  status: ResultStatus;
  http_status?: number;
  response_time_ms: number;
  retry_attempts: number;
  error?: string;
  headers?: Record<string, string>;
  message: string;
}

export interface DashboardMetrics {
  totalProjects: number;
  enabledProjects: number;
  healthyProjects: number;
  warningProjects: number;
  failedProjects: number;
  totalRunsCompleted: number;
  totalFailedRuns: number;
  lastSuccessfulRunAt?: string | null;
  nextScheduledRunAt: string;
  workerStatus: {
    name: string;
    deployed: boolean;
    activeCron: string;
    timezone: string;
    lastDeployment?: WorkerDeployment | null;
  };
}
