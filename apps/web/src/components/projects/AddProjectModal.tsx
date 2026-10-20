import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  Database,
  Globe,
  Lock,
  Play,
  RotateCw,
  Server,
  ShieldCheck,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Project, ProviderType, EnvironmentType, HttpMethod, AuthType, EndpointTestResponse } from '@heartbeat/shared';
import { api } from '../../lib/api';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSaved: () => void;
  initialProject?: Project | null;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectSaved,
  initialProject,
}) => {
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<EndpointTestResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [provider, setProvider] = useState<ProviderType>(initialProject?.provider || 'supabase');
  const [name, setName] = useState(initialProject?.name || '');
  const [environment, setEnvironment] = useState<EnvironmentType>(initialProject?.environment || 'production');
  const [baseUrl, setBaseUrl] = useState(initialProject?.base_url || '');
  const [endpointPath, setEndpointPath] = useState(initialProject?.endpoint_path || '');
  const [httpMethod, setHttpMethod] = useState<HttpMethod>(initialProject?.http_method || 'GET');
  const [authType, setAuthType] = useState<AuthType>(initialProject?.auth_type || 'none');
  const [authValue, setAuthValue] = useState('');
  const [expectedCodes, setExpectedCodes] = useState<string>(
    initialProject ? initialProject.expected_status_codes.join(', ') : '200, 204'
  );
  const [timeoutMs, setTimeoutMs] = useState<number>(initialProject?.timeout_ms || 10000);
  const [retryCount, setRetryCount] = useState<number>(initialProject?.retry_count ?? 2);
  const [enabled, setEnabled] = useState<boolean>(initialProject ? initialProject.enabled : true);

  if (!isOpen) return null;

  const handleProviderSelect = (selected: ProviderType) => {
    setProvider(selected);
    if (!endpointPath) {
      if (selected === 'supabase') setEndpointPath('/rest/v1/');
      else if (selected === 'appwrite') setEndpointPath('/v1/health');
      else setEndpointPath('/healthz');
    }
    if (selected === 'supabase') setAuthType('api_key');
    else if (selected === 'appwrite') setAuthType('none');
    setStep(2);
  };

  const handleRunDraftTest = async () => {
    setTesting(true);
    setTestResult(null);
    setErrorMessage(null);

    const codes = expectedCodes
      .split(',')
      .map((c) => parseInt(c.trim(), 10))
      .filter((n) => !isNaN(n));

    try {
      const res = await api.testDraftProject({
        provider,
        base_url: baseUrl,
        endpoint_path: endpointPath,
        http_method: httpMethod,
        auth_type: authType,
        auth_value: authValue || undefined,
        expected_status_codes: codes.length > 0 ? codes : [200],
        timeout_ms: timeoutMs,
      });
      setTestResult(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Endpoint connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);

    const codes = expectedCodes
      .split(',')
      .map((c) => parseInt(c.trim(), 10))
      .filter((n) => !isNaN(n));

    try {
      if (initialProject) {
        await api.updateProject(initialProject.id, {
          name,
          provider,
          environment,
          base_url: baseUrl,
          endpoint_path: endpointPath,
          http_method: httpMethod,
          auth_type: authType,
          auth_value: authValue || undefined,
          expected_status_codes: codes.length > 0 ? codes : [200, 204],
          timeout_ms: timeoutMs,
          retry_count: retryCount,
          enabled,
        });
      } else {
        await api.createProject({
          name,
          provider,
          environment,
          base_url: baseUrl,
          endpoint_path: endpointPath,
          http_method: httpMethod,
          auth_type: authType,
          auth_value: authValue || undefined,
          expected_status_codes: codes.length > 0 ? codes : [200, 204],
          timeout_ms: timeoutMs,
          retry_count: retryCount,
          enabled,
        });
      }
      onProjectSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { num: 1, title: 'Provider' },
    { num: 2, title: 'Endpoint' },
    { num: 3, title: 'Auth & Config' },
    { num: 4, title: 'Schedule' },
    { num: 5, title: 'Test & Save' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              {initialProject ? 'Edit Project Configuration' : 'Register New Project'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Guided 5-step setup for scheduled weekly Cloudflare health checks.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div
                onClick={() => setStep(s.num)}
                className={`flex items-center space-x-2 cursor-pointer transition-colors ${
                  step === s.num
                    ? 'text-emerald-400 font-semibold'
                    : step > s.num
                    ? 'text-slate-300'
                    : 'text-slate-500'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step === s.num
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : step > s.num
                      ? 'bg-slate-800 text-emerald-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className="text-xs hidden sm:inline">{s.title}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className="h-px w-6 bg-slate-800 hidden sm:block" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: SELECT PROVIDER */}
          {step === 1 && (
            <div className="space-y-4">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Platform Provider
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleProviderSelect('supabase')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    provider === 'supabase'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/5'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <Database className="w-7 h-7 text-emerald-400 mb-3" />
                  <div>
                    <div className="font-semibold text-sm">Supabase</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Postgres REST health probe (/rest/v1/) with anonymous/service API key.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderSelect('appwrite')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    provider === 'appwrite'
                      ? 'bg-pink-500/10 border-pink-500 text-pink-400 shadow-lg shadow-pink-500/5'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <Server className="w-7 h-7 text-pink-400 mb-3" />
                  <div>
                    <div className="font-semibold text-sm">Appwrite</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Platform health check (/v1/health) with Project ID header.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderSelect('generic')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    provider === 'generic'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/5'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <Globe className="w-7 h-7 text-blue-400 mb-3" />
                  <div>
                    <div className="font-semibold text-sm">Generic HTTP</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Custom REST APIs, microservices, webhooks, and status endpoints.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ENDPOINT & ENVIRONMENT */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Project Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production Supabase Storefront"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Environment
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as EnvironmentType)}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    HTTP Method
                  </label>
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value as HttpMethod)}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="GET">GET (Recommended)</option>
                    <option value="HEAD">HEAD</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Base Project URL (HTTPS required)
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={
                    provider === 'supabase'
                      ? 'https://abcdefghijklm.supabase.co'
                      : provider === 'appwrite'
                      ? 'https://cloud.appwrite.io'
                      : 'https://api.myapp.com'
                  }
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  SSRF Protection: Loopback, private IP ranges (RFC1918), and metadata hosts are rejected.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Health Check Endpoint Path
                </label>
                <input
                  type="text"
                  value={endpointPath}
                  onChange={(e) => setEndpointPath(e.target.value)}
                  placeholder={
                    provider === 'supabase'
                      ? '/rest/v1/'
                      : provider === 'appwrite'
                      ? '/v1/health'
                      : '/healthz'
                  }
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* STEP 3: AUTH, TIMEOUT & RETRIES */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Authentication Type
                  </label>
                  <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value as AuthType)}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="none">None (Public Endpoint)</option>
                    <option value="api_key">API Key (apikey header)</option>
                    <option value="bearer">Bearer Token (Authorization: Bearer ...)</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Expected Status Codes
                  </label>
                  <input
                    type="text"
                    value={expectedCodes}
                    onChange={(e) => setExpectedCodes(e.target.value)}
                    placeholder="200, 204"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Comma-separated (e.g. 200, 204)</p>
                </div>
              </div>

              {authType !== 'none' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {initialProject?.secret_ref ? 'Replace Authentication Credential' : 'Authentication Credential'}
                  </label>
                  <input
                    type="password"
                    value={authValue}
                    onChange={(e) => setAuthValue(e.target.value)}
                    placeholder={
                      initialProject?.secret_ref
                        ? `Stored key: ${initialProject.secret_ref} (Leave blank to keep existing)`
                        : 'Enter secret token or key'
                    }
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Secrets are encrypted and never exposed in client API responses.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Request Timeout (ms)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    max={60000}
                    step={500}
                    value={timeoutMs}
                    onChange={(e) => setTimeoutMs(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Default: 10000ms (10 seconds)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Retry Policy (Max Attempts)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={retryCount}
                    onChange={(e) => setRetryCount(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Bounded exponential backoff</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SCHEDULE */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-white">Default Weekly Sunday Schedule</h4>
                    <p className="text-xs text-slate-400">
                      Standard cron execution on Cloudflare Workers edge.
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs border border-emerald-500/20">
                    30 3 * * SUN
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Runs every Sunday at 9:00 AM IST (03:30 AM UTC)</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Participate in Scheduled Runs</div>
                  <div className="text-xs text-slate-400">
                    Include this project in the weekly automatic heartbeat check.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: TEST CONNECTION & SUMMARY */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-white">Endpoint Verification Test</h4>
                    <p className="text-xs text-slate-400">
                      Send an immediate outbound probe from the engine to verify endpoint response.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunDraftTest}
                    disabled={testing || !baseUrl}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {testing ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Probing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Run Test Now</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs font-mono text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800 truncate">
                  {httpMethod} {baseUrl}{endpointPath}
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-2 ${
                      testResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        )}
                        {testResult.message}
                      </span>
                      <span className="font-mono">
                        HTTP {testResult.http_status ?? 'ERR'} • {testResult.response_time_ms}ms
                      </span>
                    </div>

                    {testResult.headers && (
                      <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
                        Response Headers: {JSON.stringify(testResult.headers)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onClose();
            }}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center space-x-2">
            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 2 && (!name || !baseUrl)}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <span>Continue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name || !baseUrl}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {saving ? 'Saving Project...' : initialProject ? 'Update Project' : 'Save & Enable Project'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
