import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Play,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import { HeartbeatRun, HeartbeatResult } from '@heartbeat/shared';
import { api } from '../../lib/api';

interface JobsViewProps {
  jobs: HeartbeatRun[];
  onRefresh: () => void;
}

export const JobsView: React.FC<JobsViewProps> = ({ jobs, onRefresh }) => {
  const [selectedJob, setSelectedJob] = useState<HeartbeatRun | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredJobs = jobs.filter((j) => {
    const matchesType = filterType === 'all' || j.trigger_type === filterType;
    const matchesStatus = filterStatus === 'all' || j.status === filterStatus;
    return matchesType && matchesStatus;
  });

  const handleOpenJob = async (job: HeartbeatRun) => {
    setLoadingDetails(true);
    setSelectedJob(job);
    try {
      const detailed = await api.getJob(job.id);
      setSelectedJob(detailed);
    } catch {
      // keep current
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Success
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Partial Success
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" />
            Running
          </span>
        );
    }
  };

  const calculateDuration = (start: string, finish?: string | null) => {
    if (!finish) return 'In progress...';
    const s = new Date(start).getTime();
    const f = new Date(finish).getTime();
    const diff = f - s;
    if (diff < 1000) return `${diff}ms`;
    return `${(diff / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Jobs &amp; Execution History</h2>
          <p className="text-sm text-slate-400">
            Auditable execution records of scheduled Sunday batches and manual tests.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto border border-slate-700"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Trigger Types</option>
          <option value="scheduled">Scheduled (Sunday Cron)</option>
          <option value="manual">Manual Trigger</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="partial">Partial</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Jobs Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Run ID</th>
                <th className="py-3 px-3">Trigger</th>
                <th className="py-3 px-3">Started At</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Projects</th>
                <th className="py-3 px-3">Success / Fail</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No matching heartbeat jobs found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => handleOpenJob(job)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {job.id.slice(0, 8)}...
                    </td>
                    <td className="py-3.5 px-3 capitalize">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
                        {job.trigger_type === 'scheduled' ? (
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        {job.trigger_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(job.started_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-300">
                      {calculateDuration(job.started_at, job.finished_at)}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-200">
                      {job.total_projects}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="text-emerald-400 font-semibold">{job.successful_count}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-rose-400 font-semibold">{job.failed_count}</span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Run Detail Modal / Drawer */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Job Details</span>
                  <span className="font-mono text-xs text-slate-400 font-normal">
                    ({selectedJob.id})
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Started: {new Date(selectedJob.started_at).toLocaleString()} • Duration:{' '}
                  {calculateDuration(selectedJob.started_at, selectedJob.finished_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Summary Metric Chips */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400 uppercase">Total Checked</div>
                  <div className="text-lg font-bold text-white mt-1">{selectedJob.total_projects}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400 uppercase">Successful</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">{selectedJob.successful_count}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400 uppercase">Failed</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">{selectedJob.failed_count}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400 uppercase">Status</div>
                  <div className="mt-1">{getStatusBadge(selectedJob.status)}</div>
                </div>
              </div>

              {selectedJob.error_summary && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {selectedJob.error_summary}
                </div>
              )}

              {/* Individual Project Results Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden mt-4">
                <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 font-semibold text-xs text-slate-300">
                  Individual Endpoint Results
                </div>
                <div className="divide-y divide-slate-800">
                  {loadingDetails ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Loading detailed endpoint traces...
                    </div>
                  ) : !selectedJob.results || selectedJob.results.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No project results recorded for this run.
                    </div>
                  ) : (
                    selectedJob.results.map((res: HeartbeatResult) => (
                      <div key={res.id} className="p-3.5 hover:bg-slate-800/30 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-200">
                            {res.project_name || res.project_id}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            HTTP {res.http_status ?? 'N/A'} • {res.response_time_ms}ms • Retries: {res.retry_attempts}
                          </div>
                          {res.error_summary && (
                            <div className="text-[11px] text-rose-400 mt-1 font-mono">
                              Error: {res.error_summary}
                            </div>
                          )}
                        </div>
                        <div>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                              res.status === 'success'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : res.status === 'warning'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {res.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-right">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
