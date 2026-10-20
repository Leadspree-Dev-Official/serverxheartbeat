import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  Clock,
  Cpu,
  Layers,
  LayoutDashboard,
  Play,
  RotateCw,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export type TabType = 'dashboard' | 'projects' | 'jobs' | 'activity' | 'worker' | 'schedules' | 'settings';

interface ShellProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  nextRunCountdown?: string;
  onRunAll: () => Promise<void>;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({
  currentTab,
  onTabChange,
  nextRunCountdown = 'Next: Sunday at 09:00 AM IST',
  onRunAll,
  children,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const handleManualRun = async () => {
    setIsRunning(true);
    setRunMessage(null);
    try {
      await onRunAll();
      setRunMessage('Heartbeat check completed!');
      setTimeout(() => setRunMessage(null), 4000);
    } catch (err: any) {
      setRunMessage(`Run failed: ${err.message}`);
      setTimeout(() => setRunMessage(null), 5000);
    } finally {
      setIsRunning(false);
    }
  };

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects' as TabType, label: 'Projects', icon: Layers },
    { id: 'jobs' as TabType, label: 'Jobs & History', icon: Activity },
    { id: 'activity' as TabType, label: 'Activity Logs', icon: Clock },
    { id: 'worker' as TabType, label: 'Worker Management', icon: Cpu },
    { id: 'schedules' as TabType, label: 'Schedules', icon: Calendar },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Logo */}
          <div className="p-6 flex items-center space-x-3 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="w-6 h-6 text-slate-950 font-bold animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                Heartbeat <span className="text-emerald-400 text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">CF</span>
              </h1>
              <p className="text-xs text-slate-400">Cloud Infrastructure Monitor</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Footnote */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>SSRF Guard: Active (Port/IP Enforced)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Cloudflare Worker v1.0.0 • Sunday Cron Trigger
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 bg-slate-900/60 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Production Edge</span>
            </span>

            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{nextRunCountdown}</span>
            </div>
          </div>

          {/* Quick Actions & Profile */}
          <div className="flex items-center space-x-3">
            {runMessage && (
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                {runMessage.includes('failed') ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {runMessage}
              </span>
            )}

            <button
              onClick={handleManualRun}
              disabled={isRunning}
              className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Running All Checks...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run All Checks Now</span>
                </>
              )}
            </button>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                AD
              </div>
              <span className="text-xs text-slate-300 hidden md:inline">Admin</span>
            </div>
          </div>
        </header>

        {/* Viewport content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
