import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Globe,
  RotateCw,
  Send,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Schedule, WorkerDeployment } from '@heartbeat/shared';
import { api } from '../../lib/api';

interface WorkerViewProps {
  schedules: Schedule[];
  deployments: WorkerDeployment[];
  onRefresh: () => void;
}

export const WorkerView: React.FC<WorkerViewProps> = ({ schedules, deployments, onRefresh }) => {
  const activeSchedule = schedules[0];
  const [selectedDay, setSelectedDay] = useState<string>('SUN');
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    activeSchedule?.timezone || 'Asia/Kolkata'
  );

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  // Calculate UTC Cron Expression from local hour/minute in Asia/Kolkata (UTC+5:30) or UTC
  const calculateCronExpression = () => {
    if (selectedTimezone === 'Asia/Kolkata') {
      // 9:00 AM IST -> 03:30 UTC
      let totalMinutes = selectedHour * 60 + selectedMinute - 330;
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      const utcH = Math.floor(totalMinutes / 60);
      const utcM = totalMinutes % 60;
      return `${utcM} ${utcH} * * ${selectedDay}`;
    }
    // Default fallback direct UTC
    return `${selectedMinute} ${selectedHour} * * ${selectedDay}`;
  };

  const currentCron = calculateCronExpression();

  const handleSyncDeployment = async () => {
    setIsDeploying(true);
    setDeployResult(null);

    try {
      if (activeSchedule) {
        await api.updateSchedule(activeSchedule.id, {
          cron_expression: currentCron,
          timezone: selectedTimezone,
        });
      } else {
        await api.deployWorker();
      }

      setDeployResult({
        success: true,
        message: `Worker successfully deployed! Active Cron Trigger: "${currentCron}"`,
      });
      onRefresh();
    } catch (err: any) {
      setDeployResult({
        success: false,
        message: `Deployment failed: ${err.message}`,
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Cloudflare Worker &amp; Schedules</h2>
          <p className="text-sm text-slate-400">
            Configure Cron Triggers, manage execution schedules, and synchronize deployments with Cloudflare.
          </p>
        </div>
      </div>

      {deployResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            deployResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {deployResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{deployResult.message}</span>
          </div>
          <button onClick={() => setDeployResult(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Top 2 Cards: Worker Status & Schedule Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worker Runtime Status Card */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Cloudflare Worker Runtime</h3>
                <p className="text-xs text-slate-400">Script: heartbeat-engine</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Edge
            </span>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-800">
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Target Worker Script:</span>
              <span className="font-mono font-semibold text-slate-200">heartbeat-engine</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Active Cron Trigger:</span>
              <span className="font-mono font-semibold text-emerald-400">
                {activeSchedule?.cron_expression || '30 3 * * SUN'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Configured Timezone:</span>
              <span className="text-slate-200">{activeSchedule?.timezone || 'Asia/Kolkata (IST)'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Scheduled Execution:</span>
              <span className="text-slate-200">Sundays at 09:00 AM IST (03:30 AM UTC)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Least-Privilege API Token:</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Workers:Edit Scope</span>
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSyncDeployment}
              disabled={isDeploying}
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {isDeploying ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Synchronizing Cron Trigger with Cloudflare...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Redeploy &amp; Sync Cron Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Schedule Customization & Timezone Converter */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Weekly Schedule Configuration</h3>
              <p className="text-xs text-slate-400">Configure local day/time and translate to UTC Cron.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Execution Day</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="SUN">Sunday (Default)</option>
                  <option value="MON">Monday</option>
                  <option value="TUE">Tuesday</option>
                  <option value="WED">Wednesday</option>
                  <option value="THU">Thursday</option>
                  <option value="FRI">Friday</option>
                  <option value="SAT">Saturday</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Local Time</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value={0}>:00</option>
                    <option value={15}>:15</option>
                    <option value={30}>:30</option>
                    <option value={45}>:45</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Timezone</label>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                <option value="UTC">UTC (Universal Time Coordinated)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
              </select>
            </div>

            {/* Generated UTC Cron Preview */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Resulting UTC Cron:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{currentCron}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Cloudflare Worker Cron Triggers execute strictly in UTC. Changing this schedule will update the deployed Cron Trigger on Cloudflare.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Audit Trail */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-white">Worker Deployment History</h3>
            <p className="text-xs text-slate-400">Chronological record of worker cron synchronizations.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Deployment ID</th>
                <th className="py-3 px-3">Worker Script</th>
                <th className="py-3 px-3">Cron Schedule</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Started At</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {deployments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No deployment records available.
                  </td>
                </tr>
              ) : (
                deployments.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {dep.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {dep.worker_name}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400">
                      {dep.cron_schedule}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          dep.status === 'successful'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {dep.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(dep.started_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                      {dep.error_summary ? (
                        <span className="text-rose-400">{dep.error_summary}</span>
                      ) : (
                        'Applied'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
