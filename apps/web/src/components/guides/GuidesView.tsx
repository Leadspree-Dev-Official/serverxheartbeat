import React, { useState } from 'react';
import {
  BookOpen,
  Database,
  Server,
  Key,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  HelpCircle,
  Zap,
  Globe,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface GuidesViewProps {
  onNavigateAddProject?: () => void;
}

export const GuidesView: React.FC<GuidesViewProps> = ({ onNavigateAddProject }) => {
  const [activeGuide, setActiveGuide] = useState<'supabase' | 'appwrite'>('supabase');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Integration &amp; Keep-Alive Guides
          </h2>
          <p className="text-sm text-slate-400">
            Step-by-step setup guides to configure keep-alive health probes for Supabase and Appwrite to stop inactivity pauses.
          </p>
        </div>

        {onNavigateAddProject && (
          <button
            onClick={onNavigateAddProject}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
          >
            <span>+ Add New Project</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Guide Selector Pills */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveGuide('supabase')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeGuide === 'supabase'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Supabase Guide</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
            7-Day Pause
          </span>
        </button>

        <button
          onClick={() => setActiveGuide('appwrite')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeGuide === 'appwrite'
              ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Server className="w-4 h-4 text-pink-400" />
          <span>Appwrite Cloud Guide</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 font-mono">
            14-Day Pause
          </span>
        </button>
      </div>

      {/* SUPABASE GUIDE */}
      {activeGuide === 'supabase' && (
        <div className="space-y-6">
          {/* Pause Rule Explanation Banner */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 p-5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              How Supabase Inactivity Pausing Works
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Supabase automatically pauses free-tier projects if they receive <strong>zero inbound API or database traffic for 7 consecutive days (168 hours)</strong>. When paused, your PostgreSQL container is shut down and all client requests return <code>HTTP 503</code> until manually unpaused from the dashboard.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              To keep it active, ServerXHeartBeat sends an authenticated probe to your project every <strong>Sunday and Wednesday</strong> (twice a week), touching your database engine and resetting the 7-day countdown clock.
            </p>
          </div>

          {/* Step by Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: URL & Endpoints */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-mono">
                  1
                </span>
                <span>Project URL &amp; Health Endpoints</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Your Project Base URL format:</span>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-emerald-300 text-xs flex items-center justify-between">
                    <span>https://&lt;your-project-ref&gt;.supabase.co</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Found in Supabase Dashboard → Project Settings → API → Configuration.
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-slate-300 font-semibold block">Choose Your Health Endpoint:</span>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-400">/rest/v1/</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Returns database OpenAPI schema (`content-type: application/openapi+json`). Actively queries your PostgreSQL table catalog and guarantees the pause timer resets.
                    </p>
                    <div className="text-[10px] text-emerald-400">
                      Requires: <strong>service_role</strong> key.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-300">/auth/v1/health</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                        Alternative
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Checks Supabase GoTrue Auth service health.
                    </p>
                    <div className="text-[10px] text-slate-300">
                      Accepts: <strong>anon</strong> public key or <strong>service_role</strong>.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Keys & Authentication */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-mono">
                  2
                </span>
                <span>Supabase API Keys (service_role vs anon)</span>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-300">
                  Navigate to your <strong>Supabase Dashboard → Project Settings (gear icon) → API</strong>.
                </p>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">service_role (secret)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Use for /rest/v1/</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Bypasses Row Level Security and OpenAPI schema restrictions. Supabase explicitly requires this key when querying root <code>/rest/v1/</code>.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">anon (public)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Use for /auth/v1/health</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Your public client key. Works for public auth endpoints and public tables.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>How ServerXHeartBeat delivers your key:</span>
                  </div>
                  <div>
                    Our engine automatically sends your key via headers (<code>apikey</code> &amp; <code>Authorization: Bearer</code>) and as a URL query param (<code>?apikey=...</code>) to ensure Cloudflare edge proxies never drop it.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPWRITE GUIDE */}
      {activeGuide === 'appwrite' && (
        <div className="space-y-6">
          {/* Pause Rule Explanation Banner */}
          <div className="rounded-xl bg-gradient-to-r from-pink-950/40 via-slate-900 to-slate-900 border border-pink-500/20 p-5 space-y-2">
            <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              How Appwrite Cloud Inactivity Pausing Works
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Appwrite Cloud pauses inactive databases on free organizations after <strong>14 consecutive days</strong> without incoming requests.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Because Appwrite Cloud projects are regional (e.g. Singapore, Frankfurt, New York), keep-alive probes <strong>must target your project's regional endpoint</strong> and pass your <code>X-Appwrite-Project</code> ID to register activity.
            </p>
          </div>

          {/* Step by Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Regional Base URL & Project ID */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs flex items-center justify-center font-mono">
                  1
                </span>
                <span>Select Your Regional API Endpoint</span>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-300">
                  Open your <strong>Appwrite Cloud Console → Settings</strong> and check your API endpoint:
                </p>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-pink-400 font-bold">Singapore (sgp):</span>{' '}
                      <span className="text-slate-300">https://sgp.cloud.appwrite.io</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard('https://sgp.cloud.appwrite.io', 'sgp')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'sgp' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-pink-400 font-bold">Frankfurt (fra):</span>{' '}
                      <span className="text-slate-300">https://fra.cloud.appwrite.io</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard('https://fra.cloud.appwrite.io', 'fra')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'fra' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-pink-400 font-bold">New York (nyc):</span>{' '}
                      <span className="text-slate-300">https://nyc.cloud.appwrite.io</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard('https://nyc.cloud.appwrite.io', 'nyc')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'nyc' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <span className="text-slate-300 font-semibold">Locate Appwrite Project ID:</span>
                  <p className="text-[11px] text-slate-400">
                    Found in <strong>Appwrite Console → Settings → General → Project ID</strong> (e.g. <code>6a576aeb003d10b7e816</code>). Sent in the <code>X-Appwrite-Project</code> header.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Health Endpoints & API Keys */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs flex items-center justify-center font-mono">
                  2
                </span>
                <span>API Key with health.read Scope</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-pink-400">/v1/health</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 font-semibold">
                      Authenticated Keep-Alive
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Queries Appwrite's internal health check service. Returns <code>HTTP 200</code> with ping latency.
                  </p>
                  <p className="text-[10px] text-slate-300">
                    Requires an API key with the <strong>health.read</strong> scope.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-slate-300 font-semibold block">How to Create the API Key in Appwrite:</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                    <li>Go to <strong>Appwrite Console → Settings → API Keys</strong>.</li>
                    <li>Click <strong>Create API Key</strong>.</li>
                    <li>Name it <code>heartbeat-monitor</code>.</li>
                    <li>Under Scopes, check only <strong>health.read</strong> (least privilege).</li>
                    <li>Click <strong>Create</strong> and copy the secret key.</li>
                  </ol>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                  <span className="text-white font-semibold block mb-0.5">Alternative Public Endpoint:</span>
                  <code>/v1/health/version</code> does not require an API key, only your Project ID!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
