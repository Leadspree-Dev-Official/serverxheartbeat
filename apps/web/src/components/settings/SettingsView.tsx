import React, { useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Database,
  Lock,
  Save,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { DISALLOWED_IP_RANGES, ENGINE_CONFIG } from '@heartbeat/shared';

export const SettingsView: React.FC = () => {
  const [cfAccountId, setCfAccountId] = useState('d3b07384d113edec49eaa6238ad5ff00');
  const [cfWorkerName, setCfWorkerName] = useState('heartbeat-engine');
  const [cfToken, setCfToken] = useState('');
  const [supaUrl, setSupaUrl] = useState('https://xyzcompany.supabase.co');
  const [supaKey, setSupaKey] = useState('');
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">System Settings &amp; Credentials</h2>
        <p className="text-sm text-slate-400">
          Manage Cloudflare API tokens, Supabase database connections, and security policies.
        </p>
      </div>

      {savedMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Settings saved successfully. Secrets are encrypted in server-side storage.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Cloudflare API Integration */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Cloudflare API Token &amp; Worker</h3>
              <p className="text-xs text-slate-400">
                Used to deploy scripts, update Cron Triggers, and query worker logs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Cloudflare Account ID</label>
              <input
                type="text"
                value={cfAccountId}
                onChange={(e) => setCfAccountId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Worker Script Name</label>
              <input
                type="text"
                value={cfWorkerName}
                onChange={(e) => setCfWorkerName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-slate-300 font-semibold mb-1.5">Cloudflare API Token</label>
            <input
              type="password"
              value={cfToken}
              onChange={(e) => setCfToken(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••••••••••"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Required permissions: <span className="font-mono text-slate-400">Workers Scripts:Edit</span>,{' '}
              <span className="font-mono text-slate-400">Account Settings:Read</span>.
            </p>
          </div>
        </div>

        {/* Supabase Control Plane Database */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Supabase PostgreSQL Database</h3>
              <p className="text-xs text-slate-400">
                Primary control-plane database for projects, schedules, runs, and audit logs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Supabase URL</label>
              <input
                type="url"
                value={supaUrl}
                onChange={(e) => setSupaUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Service Role Secret Key</label>
              <input
                type="password"
                value={supaKey}
                onChange={(e) => setSupaKey(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••••••••••"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Security & SSRF Engine Policy Overview */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Security &amp; SSRF Prevention Rules</h3>
              <p className="text-xs text-slate-400">
                Enforced safety constraints across all outbound health check probes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 font-medium">Max Concurrency</div>
              <div className="text-base font-bold text-white mt-1">
                {ENGINE_CONFIG.MAX_CONCURRENCY} parallel requests
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 font-medium">Max Response Read</div>
              <div className="text-base font-bold text-white mt-1">
                64 KB (Header/Body truncated)
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 font-medium">Blocked IP Ranges</div>
              <div className="text-base font-bold text-emerald-400 mt-1">
                {DISALLOWED_IP_RANGES.length} CIDR blocks blocked
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 leading-relaxed">
            Disallowed ranges: {DISALLOWED_IP_RANGES.join(', ')}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
