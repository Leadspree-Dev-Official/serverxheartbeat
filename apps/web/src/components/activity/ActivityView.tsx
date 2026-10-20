import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  RotateCw,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ActivityLog } from '@heartbeat/shared';

interface ActivityViewProps {
  logs: ActivityLog[];
  onRefresh: () => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ logs, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.metadata).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOutcome = outcomeFilter === 'all' || log.outcome === outcomeFilter;
    return matchesSearch && matchesOutcome;
  });

  const getActionIcon = (action: string) => {
    if (action.startsWith('project.')) {
      return <Layers className="w-4 h-4 text-emerald-400" />;
    } else if (action.startsWith('worker.') || action.startsWith('deployment.')) {
      return <Cpu className="w-4 h-4 text-blue-400" />;
    } else if (action.startsWith('schedule.')) {
      return <Calendar className="w-4 h-4 text-purple-400" />;
    } else if (action.startsWith('endpoint.')) {
      return <Zap className="w-4 h-4 text-amber-400" />;
    }
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Activity &amp; Audit Logs</h2>
          <p className="text-sm text-slate-400">
            Immutable operational audit trail for project mutations, deployments, and executions.
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

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by action, actor, or metadata..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Outcomes</option>
          <option value="success">Success Only</option>
          <option value="failed">Failures Only</option>
        </select>
      </div>

      {/* Audit List */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden divide-y divide-slate-800/60">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No audit records found matching your filters.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-start justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                  {getActionIcon(log.action)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-200">{log.action}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] uppercase font-mono">
                      {log.resource_type}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        log.outcome === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {log.outcome}
                    </span>
                  </div>

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-1 text-xs text-slate-400 font-mono">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}

                  <div className="mt-1 text-[11px] text-slate-500">
                    Actor: {log.actor_email || 'System / Cloudflare Cron'}
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
