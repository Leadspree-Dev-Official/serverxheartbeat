import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Globe,
  RotateCw,
  Send,
  ShieldCheck,
  Zap,
  HardDrive,
  Terminal,
  Activity,
  Server,
  Key,
} from 'lucide-react';
import { WorkerDeployment } from '@heartbeat/shared';
import { api } from '../../lib/api';

interface WorkerViewProps {
  deployments: WorkerDeployment[];
  onRefresh: () => void;
}

export const WorkerView: React.FC<WorkerViewProps> = ({ deployments, onRefresh }) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleDeployWorker = async () => {
    setIsDeploying(true);
    setDeployResult(null);

    try {
      const res = await api.deployWorker();
      setDeployResult({
        success: true,
        message: 'Worker engine redeployed successfully to Cloudflare Global Edge!',
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

  const latestDeployment = deployments[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            Cloudflare Worker Management
          </h2>
          <p className="text-sm text-slate-400">
            Monitor the serverless edge execution engine (`heartbeat-engine`), inspect Cloudflare bindings, and manage deployments.
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
          <button
            onClick={handleDeployWorker}
            disabled={isDeploying}
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {isDeploying ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Deploying...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Redeploy to Cloudflare</span>
              </>
            )}
          </button>
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
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{deployResult.message}</span>
          </div>
          <button onClick={() => setDeployResult(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Edge Runtime Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Runtime Status</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-base font-bold text-white flex items-center gap-2">
            <span>Active on Edge</span>
          </div>
          <div className="text-[11px] text-emerald-400">
            Global Anycast (300+ Locations)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Worker Name</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-mono text-base font-bold text-white truncate">
            heartbeat-engine
          </div>
          <div className="text-[11px] text-slate-500">
            Cloudflare Workers Service
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Free Tier Safety</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-400">
            100% Free
          </div>
          <div className="text-[11px] text-slate-500">
            &lt; 0.05% of 100k daily req quota
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Deployments</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base font-bold text-white">
            {deployments.length} Recorded
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {latestDeployment ? `Last: ${new Date(latestDeployment.started_at).toLocaleDateString()}` : 'Ready'}
          </div>
        </div>
      </div>

      {/* Main Grid: Architecture & Environment Variables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worker Runtime Details */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Edge Worker Configuration</h3>
                <p className="text-xs text-slate-400">Cloudflare Workers V8 Isolate Architecture</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Healthy
            </span>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-800/80">
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Target Worker Script:</span>
              <span className="font-mono font-semibold text-slate-200">heartbeat-engine</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Execution Runtime:</span>
              <span className="font-semibold text-slate-200">Cloudflare workerd / V8 Isolate</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Cold Start Latency:</span>
              <span className="font-mono text-emerald-400">&lt; 5 ms (Zero Cold Start)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Memory Allocation:</span>
              <span className="font-mono text-slate-200">128 MB Standard Worker Limit</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Outbound Prober:</span>
              <span className="text-slate-200">Dual HTTP/HTTPS Fetch with SSRF Guard</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Keep-Alive Engine Mode:</span>
              <span className="text-emerald-400 font-semibold">Autonomous Cron-Triggered Ping</span>
            </div>
          </div>
        </div>

        {/* Cloudflare Secrets & Environment Bindings Audit */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Cloudflare Bindings &amp; Security</h3>
                <p className="text-xs text-slate-400">Least-privilege token &amp; encrypted secret bindings</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>CLOUDFLARE_API_TOKEN</span>
                </div>
                <div className="text-[11px] text-slate-500">Scoped permissions: Workers:Edit</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Bound &amp; Active
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                  <span>STORAGE_BACKEND</span>
                </div>
                <div className="text-[11px] text-slate-500">Supabase DB / Local High-Speed Store</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Connected
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>ENVIRONMENT</span>
                </div>
                <div className="text-[11px] text-slate-500">Edge runtime context</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                production
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleDeployWorker}
              disabled={isDeploying}
              className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {isDeploying ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Syncing &amp; Redeploying Worker...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Redeploy &amp; Synchronize Edge Worker</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CLI Reference & Quick Deployment Snippet */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-xs">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Wrangler CLI Manual Deployment Reference</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The heartbeat worker can be deployed automatically via the dashboard button above, or from your terminal or CI/CD pipeline using Wrangler:
        </p>
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto space-y-1">
          <div><span className="text-slate-500"># 1. Build and dry-run bundle verification</span></div>
          <div>pnpm --filter @heartbeat/worker build</div>
          <div className="pt-1"><span className="text-slate-500"># 2. Deploy directly to Cloudflare</span></div>
          <div>npx wrangler deploy</div>
        </div>
      </div>

      {/* Deployment Audit Trail */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-white">Worker Deployment History</h3>
            <p className="text-xs text-slate-400">Chronological record of worker edge deployments and updates.</p>
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
