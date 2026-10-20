import React from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Layers,
  Play,
  Plus,
  RotateCw,
  Server,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { DashboardMetrics, Project, HeartbeatRun } from '@heartbeat/shared';
import { AddProjectModal } from '../projects/AddProjectModal';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  projects: Project[];
  recentRuns: HeartbeatRun[];
  onTestProject: (id: string) => Promise<void>;
  onNavigateProjects: () => void;
  onNavigateJobs: () => void;
  onRefresh?: () => void;
  isLoading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  projects,
  recentRuns,
  onTestProject,
  onNavigateProjects,
  onNavigateJobs,
  onRefresh,
  isLoading,
}) => {
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await onTestProject(id);
    } finally {
      setTestingId(null);
    }
  };

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return 'Never checked';
    const date = new Date(isoString);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Healthy
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Warning
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Disabled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Unknown
          </span>
        );
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'supabase':
        return <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Supabase</span>;
      case 'appwrite':
        return <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded bg-pink-950 text-pink-400 border border-pink-800">Appwrite</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded bg-blue-950 text-blue-400 border border-blue-800">Generic HTTP</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Add Project Shortcut */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">System Dashboard</h2>
          <p className="text-sm text-slate-400">
            Portfolio health metrics, scheduled heartbeat runs, and Cloudflare Worker status.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>
        </div>
      </div>

      {/* Provider Compliance & Notice Banner (PRD Section 1.2 & 4.1) */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-3.5">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="font-semibold text-amber-300">Provider Health vs. Lifecycle Policy:</strong>{' '}
          A successful HTTP 200 response confirms that the network endpoint is currently reachable and responding. Periodic health checks do not override cloud provider account restrictions, terms of service, or guarantee immunity from inactivity pauses where provider terms dictate.
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Registered Projects</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{metrics?.totalProjects ?? projects.length}</span>
            <span className="text-xs text-slate-400">({metrics?.enabledProjects ?? projects.filter(p => p.enabled).length} active)</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Across Supabase, Appwrite, HTTP</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Healthy Endpoints</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{metrics?.healthyProjects ?? projects.filter(p => p.last_status === 'healthy').length}</span>
            <span className="text-xs text-emerald-500 font-medium">100% reachable</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Responding within timeout</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Warnings / Failures</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">
              {(metrics?.warningProjects ?? 0) + (metrics?.failedProjects ?? 0)}
            </span>
            <span className="text-xs text-slate-400">requiring review</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{metrics?.failedProjects ?? 0} failed, {metrics?.warningProjects ?? 0} degraded</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Worker Cron Trigger</span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-white font-mono">{metrics?.workerStatus?.activeCron || '30 3 * * SUN'}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>Sundays 09:00 IST (03:30 UTC)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Projects Health Table & Recent Runs Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Health Table (PRD 5.2) */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-white">Project Health Overview</h3>
              <p className="text-xs text-slate-400">Status, measured response latency, and endpoint state.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Project</span>
              </button>
              <button
                onClick={onNavigateProjects}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition-colors"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-3">Provider</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Latency</th>
                  <th className="py-3 px-3">Last Checked</th>
                  <th className="py-3 px-4 text-right">Quick Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Layers className="w-8 h-8 text-slate-600 mb-2" />
                        <p className="text-xs text-slate-400 font-medium">No projects configured yet.</p>
                        <button
                          onClick={onNavigateProjects}
                          className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-colors"
                        >
                          + Register Your First Project
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  projects.slice(0, 5).map((project) => (
                    <tr key={project.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{project.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs font-mono">
                          {project.base_url}{project.endpoint_path}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getProviderIcon(project.provider)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getStatusBadge(project.last_status)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-300">
                        {project.last_response_time_ms ? `${project.last_response_time_ms}ms` : '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-400">
                        {formatRelativeTime(project.last_checked_at)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleTest(project.id)}
                          disabled={testingId === project.id}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {testingId === project.id ? (
                            <RotateCw className="w-3 h-3 animate-spin text-emerald-400" />
                          ) : (
                            <Play className="w-3 h-3 text-slate-400" />
                          )}
                          <span>Test</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Heartbeat Executions Card */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-white">Recent Heartbeat Runs</h3>
                <p className="text-xs text-slate-400">Weekly Sunday &amp; manual jobs.</p>
              </div>
              <button
                onClick={onNavigateJobs}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <span>All Jobs</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-800/60 space-y-3">
              {recentRuns.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No execution runs recorded yet.
                </div>
              ) : (
                recentRuns.slice(0, 4).map((run) => (
                  <div key={run.id} className="pt-3 first:pt-0 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-200 capitalize">
                          {run.trigger_type} Run
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            run.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : run.status === 'partial'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {run.successful_count} / {run.total_projects} succeeded
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      {formatRelativeTime(run.started_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Schedule Status Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 rounded-b-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Next Scheduled Execution</span>
              <span className="text-emerald-400 font-medium">Sunday 03:30 UTC</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Cloudflare Cron Trigger active on edge worker.
            </div>
          </div>
        </div>
      </div>

      {/* Add Project Modal Shortcut */}
      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProjectSaved={() => {
          setIsAddModalOpen(false);
          onRefresh?.();
        }}
      />
    </div>
  );
};
