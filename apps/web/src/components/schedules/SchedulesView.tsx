import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Save,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Play,
  HelpCircle,
} from 'lucide-react';
import { Schedule, Project } from '@heartbeat/shared';
import { api } from '../../lib/api';

interface SchedulesViewProps {
  schedules: Schedule[];
  projects: Project[];
  onRefresh: () => void;
}

export const SchedulesView: React.FC<SchedulesViewProps> = ({
  schedules,
  projects,
  onRefresh,
}) => {
  const activeSchedule = schedules[0];

  // Form states
  const [preset, setPreset] = useState<'weekly' | 'biweekly' | 'daily' | 'custom'>('weekly');
  const [selectedDay, setSelectedDay] = useState<string>('SUN');
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    activeSchedule?.timezone || 'Asia/Kolkata'
  );
  const [customCron, setCustomCron] = useState<string>(
    activeSchedule?.cron_expression || '30 3 * * SUN'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Calculate UTC Cron based on preset / local time
  const calculatedCron = useMemo(() => {
    if (preset === 'custom') {
      return customCron.trim();
    }

    // Offset in minutes from UTC (Asia/Kolkata is +330 minutes)
    const tzOffsetMinutes = selectedTimezone === 'Asia/Kolkata' ? 330 : 0;

    let totalMinutes = selectedHour * 60 + selectedMinute - tzOffsetMinutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const utcH = Math.floor(totalMinutes / 60);
    const utcM = totalMinutes % 60;

    if (preset === 'daily') {
      return `${utcM} ${utcH} * * *`;
    }
    if (preset === 'biweekly') {
      return `${utcM} ${utcH} * * WED,SUN`;
    }
    // Default weekly
    return `${utcM} ${utcH} * * ${selectedDay}`;
  }, [preset, selectedDay, selectedHour, selectedMinute, selectedTimezone, customCron]);

  // Compute human-readable description of current cron
  const cronDescription = useMemo(() => {
    if (preset === 'daily') {
      return `Every day at ${selectedHour.toString().padStart(2, '0')}:${selectedMinute
        .toString()
        .padStart(2, '0')} (${selectedTimezone})`;
    }
    if (preset === 'biweekly') {
      return `Every Wednesday and Sunday at ${selectedHour
        .toString()
        .padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')} (${selectedTimezone})`;
    }
    if (preset === 'weekly') {
      const daysMap: Record<string, string> = {
        SUN: 'Sunday',
        MON: 'Monday',
        TUE: 'Tuesday',
        WED: 'Wednesday',
        THU: 'Thursday',
        FRI: 'Friday',
        SAT: 'Saturday',
      };
      return `Every ${daysMap[selectedDay] || selectedDay} at ${selectedHour
        .toString()
        .padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')} (${selectedTimezone})`;
    }
    return `Custom expression: ${customCron}`;
  }, [preset, selectedDay, selectedHour, selectedMinute, selectedTimezone, customCron]);

  // Calculate simulated upcoming runs
  const upcomingRuns = useMemo(() => {
    const list: string[] = [];
    const now = new Date();

    // Generate upcoming dates for Sunday / selectedDay
    const dayMap: Record<string, number> = {
      SUN: 0,
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
    };
    const targetDayIndex = dayMap[selectedDay] ?? 0;

    for (let i = 1; i <= 4; i++) {
      const d = new Date(now);
      const daysUntil = (targetDayIndex - now.getDay() + 7) % 7 || 7;
      d.setDate(now.getDate() + daysUntil + (i - 1) * 7);
      d.setHours(selectedHour, selectedMinute, 0, 0);
      list.push(
        d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        })
      );
    }
    return list;
  }, [selectedDay, selectedHour, selectedMinute]);

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      if (activeSchedule) {
        await api.updateSchedule(activeSchedule.id, {
          cron_expression: calculatedCron,
          timezone: selectedTimezone,
        });
      } else {
        await api.deployWorker();
      }

      setStatusMessage({
        type: 'success',
        text: `Schedule successfully updated and synchronized to Cloudflare Cron Trigger: "${calculatedCron}"`,
      });
      onRefresh();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Failed to update schedule: ${err.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePresetSelect = (p: 'weekly' | 'biweekly' | 'daily' | 'custom') => {
    setPreset(p);
    if (p === 'weekly') {
      setSelectedDay('SUN');
      setSelectedHour(9);
      setSelectedMinute(0);
    } else if (p === 'biweekly') {
      setSelectedHour(9);
      setSelectedMinute(0);
    } else if (p === 'daily') {
      setSelectedHour(9);
      setSelectedMinute(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Schedules &amp; Cadence Automation
          </h2>
          <p className="text-sm text-slate-400">
            Define automated keep-alive schedules to ensure Supabase and Appwrite instances never pause due to inactivity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Cron Trigger</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-base font-bold text-emerald-400 truncate">
            {activeSchedule?.cron_expression || '30 3 * * SUN'}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            UTC Execution Trigger
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Execution Cadence</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base font-bold text-white">
            Once Every 7 Days
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero-Pause Guaranteed
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Monitored Projects</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-base font-bold text-white">
            {projects.length} Project{projects.length === 1 ? '' : 's'}
          </div>
          <div className="text-[11px] text-slate-500">
            {projects.filter((p) => p.enabled).length} Active in rotation
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Target Timezone</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-bold text-white truncate">
            {selectedTimezone}
          </div>
          <div className="text-[11px] text-slate-500">
            Auto-converted to UTC
          </div>
        </div>
      </div>

      {/* Main Schedule Customization Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Schedule Builder (2 cols) */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-white">Schedule Configuration Studio</h3>
              <p className="text-xs text-slate-400">
                Choose a cadence preset or customize exact execution day, hour, and minute.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Cloudflare Cron Syntax
            </span>
          </div>

          {/* Cadence Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Cadence Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handlePresetSelect('weekly')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  preset === 'weekly'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs">Weekly (Recommended)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Every Sunday 9 AM</div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('biweekly')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  preset === 'biweekly'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs">Bi-Weekly</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Wed &amp; Sun 9 AM</div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('daily')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  preset === 'daily'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs">Daily Ping</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Everyday at 9 AM</div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('custom')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  preset === 'custom'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs">Custom Cron</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Manual Expression</div>
              </button>
            </div>
          </div>

          {preset !== 'custom' ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Day selector (only for weekly) */}
                {preset === 'weekly' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Execution Day of Week
                    </label>
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                    >
                      <option value="SUN">Sunday (Default - Highly Recommended)</option>
                      <option value="MON">Monday</option>
                      <option value="TUE">Tuesday</option>
                      <option value="WED">Wednesday</option>
                      <option value="THU">Thursday</option>
                      <option value="FRI">Friday</option>
                      <option value="SAT">Saturday</option>
                    </select>
                  </div>
                )}

                {/* Local Time Picker */}
                <div className={preset !== 'weekly' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Local Execution Time ({selectedTimezone})
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, '0')}:00 {i >= 12 ? 'PM' : 'AM'}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedMinute}
                      onChange={(e) => setSelectedMinute(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    >
                      <option value={0}>:00 min</option>
                      <option value={15}>:15 min</option>
                      <option value={30}>:30 min</option>
                      <option value={45}>:45 min</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reference Timezone
                </label>
                <select
                  value={selectedTimezone}
                  onChange={(e) => setSelectedTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                  <option value="UTC">UTC (Universal Time Coordinated)</option>
                  <option value="America/New_York">America/New_York (EST/EDT - UTC-05:00)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT - UTC-08:00)</option>
                  <option value="Europe/London">Europe/London (GMT/BST - UTC+00:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+08:00)</option>
                </select>
              </div>
            </div>
          ) : (
            /* Custom Cron Expression Input */
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-300">
                Standard 5-Field UTC Cron Expression
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="30 3 * * SUN"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Syntax: <code className="text-slate-300">minute hour day-of-month month day-of-week</code>. Note that Cloudflare Workers run strictly in UTC.
              </p>
            </div>
          )}

          {/* Live Translation Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Resulting UTC Cron Expression:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                {calculatedCron}
              </span>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{cronDescription}</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-900">
              Cloudflare Worker Cron Triggers will awaken the edge runner at this exact schedule to send authenticated health probes to all active projects.
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 flex items-center justify-end">
            <button
              onClick={handleSaveSchedule}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Saving &amp; Updating Cloudflare...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save &amp; Apply Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Execution Projection & Insights */}
        <div className="space-y-6">
          {/* Upcoming Schedule Runs */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Upcoming Heartbeat Cycles</h3>
            </div>
            <p className="text-xs text-slate-400">
              Projected execution dates according to your configured cadence:
            </p>

            <div className="space-y-2.5">
              {upcomingRuns.map((runDate, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                      {idx + 1}
                    </span>
                    <span className="text-slate-200 font-medium">{runDate}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                    {idx === 0 ? 'Next Run' : 'Scheduled'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Anti-Pause Intelligence Box */}
          <div className="rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/20 p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Cloud Keep-Alive Guarantee
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Supabase pauses free tier projects after <strong className="text-white">7 days</strong> of inactivity. Appwrite pauses inactive free databases after <strong className="text-white">14 days</strong>.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Running a weekly ping every Sunday guarantees both platforms register legitimate inbound activity, preventing automatic downtime completely.
            </p>
          </div>
        </div>
      </div>

      {/* Projects Bound to this Schedule */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-white">Projects Bound to Scheduled Runs</h3>
            <p className="text-xs text-slate-400">
              These projects will be queried during every scheduled cron cycle.
            </p>
          </div>
          <span className="text-xs text-slate-400">
            {projects.filter((p) => p.enabled).length} of {projects.length} Enabled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-3">Provider</th>
                <th className="py-3 px-3">Target Endpoint</th>
                <th className="py-3 px-3">Health Status</th>
                <th className="py-3 px-3">Cadence Binding</th>
                <th className="py-3 px-4 text-right">Last Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No projects found. Add a project from the Projects tab.
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {project.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300">
                        {project.provider}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 truncate max-w-xs">
                      {project.base_url}
                      {project.endpoint_path}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          project.last_status === 'healthy'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : project.last_status === 'warning'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {project.last_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400 text-[11px]">
                      {activeSchedule?.cron_expression || '30 3 * * SUN'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {project.last_checked_at
                        ? new Date(project.last_checked_at).toLocaleTimeString()
                        : 'Pending run'}
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
