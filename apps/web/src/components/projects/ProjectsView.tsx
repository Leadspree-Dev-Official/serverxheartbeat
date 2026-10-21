import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  Filter,
  Layers,
  Play,
  Plus,
  RotateCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Project, EndpointTestResponse } from '@heartbeat/shared';
import { api } from '../../lib/api';
import { AddProjectModal } from './AddProjectModal';

interface ProjectsViewProps {
  projects: Project[];
  onRefresh: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Test Runner State
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ projectId: string; result: EndpointTestResponse } | null>(null);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.base_url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvider = selectedProvider === 'all' || p.provider === selectedProvider;
    const matchesEnv = selectedEnvironment === 'all' || p.environment === selectedEnvironment;
    const matchesStatus = selectedStatus === 'all' || p.last_status === selectedStatus;
    return matchesSearch && matchesProvider && matchesEnv && matchesStatus;
  });

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.testProject(id);
      setTestResult({ projectId: id, result: res });
      onRefresh();
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleEnable = async (project: Project) => {
    try {
      await api.updateProject(project.id, { enabled: !project.enabled });
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update project: ${err.message}`);
    }
  };

  const handleDuplicate = async (project: Project) => {
    // Duplicate config without copying secrets (PRD 4.2)
    try {
      await api.createProject({
        name: `${project.name} (Copy)`,
        provider: project.provider,
        environment: project.environment,
        base_url: project.base_url,
        endpoint_path: project.endpoint_path,
        http_method: project.http_method,
        auth_type: project.auth_type,
        secret_ref: null, // Clear secret
        expected_status_codes: project.expected_status_codes,
        timeout_ms: project.timeout_ms,
        retry_count: project.retry_count,
        enabled: false, // Start paused
      });
      onRefresh();
    } catch (err: any) {
      alert(`Failed to duplicate: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.deleteProject(id);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const formatSchedule = (p: Project) => {
    if (p.schedule_days && p.schedule_days.length > 0) {
      const days = p.schedule_days.length === 7 ? 'Daily' : p.schedule_days.join(', ');
      const hour = p.schedule_hours && p.schedule_hours[0] !== undefined ? p.schedule_hours[0] : 9;
      const min = p.schedule_minutes ?? 0;
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return `${days} • ${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
    }
    return p.cron_expression || 'Sun, Wed • 9:00 AM';
  };

  const getStatusBadge = (status: string, enabled: boolean) => {
    if (!enabled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          Disabled
        </span>
      );
    }
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Healthy
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Warning
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Project Management</h2>
          <p className="text-sm text-slate-400">
            Register and monitor cloud-hosted endpoints across Supabase, Appwrite, and custom services.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by name or URL..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Provider Filter */}
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Providers</option>
            <option value="supabase">Supabase</option>
            <option value="appwrite">Appwrite</option>
            <option value="generic">Generic HTTP</option>
          </select>

          {/* Environment Filter */}
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-3">Provider</th>
                <th className="py-3 px-3">Environment</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Latency</th>
                <th className="py-3 px-3">Schedule</th>
                <th className="py-3 px-3">Enabled</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
                        <Plus className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-white mb-1">No projects registered</h4>
                      <p className="text-xs text-slate-400 mb-4">
                        Add your first Supabase, Appwrite, or HTTP service endpoint to begin scheduled health checks.
                      </p>
                      <button
                        onClick={() => {
                          setEditingProject(null);
                          setIsModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
                      >
                        + Add First Project
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No matching projects found with selected filters.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100">{project.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate max-w-sm">
                        {project.http_method} {project.base_url}{project.endpoint_path}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="capitalize text-slate-300 font-medium">
                        {project.provider}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {project.environment}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {getStatusBadge(project.last_status, project.enabled)}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap font-mono text-slate-300">
                      {project.last_response_time_ms ? `${project.last_response_time_ms}ms` : '—'}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{formatSchedule(project)}</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 pl-5">
                          {project.cron_expression || '30 3 * * SUN,WED'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={project.enabled}
                          onChange={() => handleToggleEnable(project)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
                      </label>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => handleTest(project.id)}
                        disabled={testingId === project.id}
                        title="Test Endpoint Now"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 disabled:opacity-50"
                      >
                        {testingId === project.id ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setEditingProject(project);
                          setIsModalOpen(true);
                        }}
                        title="Edit Project"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(project)}
                        title="Duplicate Configuration (Without Secrets)"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(project.id, project.name)}
                        title="Delete Project"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Result Drawer / Modal */}
      {testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                {testResult.result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                )}
                <span>Test Execution Result</span>
              </h3>
              <button
                onClick={() => setTestResult(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Response Status:</span>
                <span className="font-mono font-semibold text-slate-200">
                  HTTP {testResult.result.http_status ?? 'No response'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Response Latency:</span>
                <span className="font-mono text-emerald-400">
                  {testResult.result.response_time_ms}ms
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Outcome:</span>
                <span className="capitalize font-semibold text-slate-200">
                  {testResult.result.status}
                </span>
              </div>
              <div className="pt-2">
                <div className="text-slate-400 mb-1">Status Message:</div>
                <div className="p-2.5 rounded bg-slate-950 font-mono text-slate-300 text-[11px] border border-slate-800">
                  {testResult.result.message}
                </div>
              </div>

              {testResult.result.headers && (
                <div className="pt-2">
                  <div className="text-slate-400 mb-1">Response Headers:</div>
                  <pre className="p-2.5 rounded bg-slate-950 text-[11px] font-mono text-slate-400 border border-slate-800 overflow-x-auto">
                    {JSON.stringify(testResult.result.headers, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => setTestResult(null)}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Project Guided Wizard Modal */}
      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectSaved={onRefresh}
        initialProject={editingProject}
      />
    </div>
  );
};
