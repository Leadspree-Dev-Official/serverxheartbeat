-- Heartbeat Manager - PostgreSQL Schema & Migrations
-- PRD Version 1.0

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. SCHEDULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL DEFAULT '30 3 * * SUN',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('supabase', 'appwrite', 'generic')),
    environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
    base_url TEXT NOT NULL,
    endpoint_path TEXT NOT NULL DEFAULT '',
    http_method TEXT NOT NULL DEFAULT 'GET' CHECK (http_method IN ('GET', 'POST', 'HEAD')),
    auth_type TEXT NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'api_key', 'basic')),
    secret_ref TEXT,               -- Encrypted or reference key; never raw secrets
    custom_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    expected_status_codes JSONB NOT NULL DEFAULT '[200, 204]'::jsonb,
    timeout_ms INTEGER NOT NULL DEFAULT 10000 CHECK (timeout_ms BETWEEN 1000 AND 60000),
    retry_count INTEGER NOT NULL DEFAULT 2 CHECK (retry_count BETWEEN 0 AND 5),
    schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_checked_at TIMESTAMPTZ,
    last_successful_at TIMESTAMPTZ,
    last_status TEXT DEFAULT 'unknown' CHECK (last_status IN ('healthy', 'warning', 'failed', 'unknown', 'disabled')),
    last_response_time_ms INTEGER,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. HEARTBEAT RUNS (JOBS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS heartbeat_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    total_projects INTEGER NOT NULL DEFAULT 0,
    successful_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
    error_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. HEARTBEAT RESULTS (PER-PROJECT EXECUTION IN RUN)
-- ============================================================================
CREATE TABLE IF NOT EXISTS heartbeat_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES heartbeat_runs(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    http_status INTEGER,
    response_time_ms INTEGER NOT NULL DEFAULT 0,
    retry_attempts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'failed')),
    error_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. ACTIVITY AND AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_email TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failed')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. WORKER DEPLOYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS worker_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_name TEXT NOT NULL DEFAULT 'heartbeat-engine',
    version TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'successful', 'failed')),
    initiated_by UUID,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    cron_schedule TEXT NOT NULL DEFAULT '30 3 * * SUN',
    error_summary TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_enabled ON projects(enabled);
CREATE INDEX IF NOT EXISTS idx_projects_provider ON projects(provider);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(last_status);
CREATE INDEX IF NOT EXISTS idx_heartbeat_results_run ON heartbeat_results(run_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_results_project ON heartbeat_results(project_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_runs_started ON heartbeat_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_deployments_started ON worker_deployments(started_at DESC);

-- ============================================================================
-- TRIGGER: auto update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_schedules_updated_at ON schedules;
CREATE TRIGGER trigger_schedules_updated_at
    BEFORE UPDATE ON schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartbeat_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartbeat_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_deployments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full operational access
CREATE POLICY "Allow authenticated read on schedules" ON schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on schedules" ON schedules FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on projects" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on projects" ON projects FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on runs" ON heartbeat_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on runs" ON heartbeat_runs FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on results" ON heartbeat_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on results" ON heartbeat_results FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on activity" ON activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on activity" ON activity_logs FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on deployments" ON worker_deployments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write on deployments" ON worker_deployments FOR ALL TO authenticated USING (true);

-- Service role policies (used by Cloudflare Worker execution engine)
CREATE POLICY "Allow service_role full on schedules" ON schedules FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full on projects" ON projects FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full on runs" ON heartbeat_runs FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full on results" ON heartbeat_results FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full on activity" ON activity_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full on deployments" ON worker_deployments FOR ALL TO service_role USING (true);

-- ============================================================================
-- SEED DATA (Default setup for rapid bootstrapping)
-- ============================================================================
INSERT INTO schedules (id, name, cron_expression, timezone, enabled)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Default Weekly Sunday Run',
    '30 3 * * SUN',
    'Asia/Kolkata',
    true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, name, provider, environment, base_url, endpoint_path, http_method, auth_type, expected_status_codes, timeout_ms, retry_count, schedule_id, enabled, last_status, last_response_time_ms)
VALUES
(
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
    'E-Commerce Backend (Supabase)',
    'supabase',
    'production',
    'https://xyzcompany.supabase.co',
    '/rest/v1/',
    'GET',
    'api_key',
    '[200, 204]'::jsonb,
    10000,
    2,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    true,
    'healthy',
    142
),
(
    'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
    'Mobile Auth & Storage (Appwrite)',
    'appwrite',
    'production',
    'https://cloud.appwrite.io',
    '/v1/health',
    'GET',
    'none',
    '[200]'::jsonb,
    10000,
    2,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    true,
    'healthy',
    215
),
(
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44',
    'Notification Microservice (Generic)',
    'generic',
    'staging',
    'https://api.notifications.internal.example.com',
    '/healthz',
    'GET',
    'bearer',
    '[200]'::jsonb,
    8000,
    2,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    true,
    'warning',
    890
) ON CONFLICT (id) DO NOTHING;

INSERT INTO worker_deployments (id, worker_name, version, status, started_at, finished_at, cron_schedule)
VALUES (
    'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55',
    'heartbeat-engine',
    'v1.0.0',
    'successful',
    now() - interval '2 days',
    now() - interval '2 days' + interval '12 seconds',
    '30 3 * * SUN'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_logs (action, resource_type, outcome, metadata)
VALUES
(
    'system.bootstrap',
    'system',
    'success',
    '{"message": "Heartbeat Manager initialized with default Sunday cron schedule and seed projects"}'::jsonb
);
