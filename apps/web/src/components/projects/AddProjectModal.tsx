import React, { useState } from 'react';
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Database,
  Globe,
  Lock,
  Play,
  Plus,
  RotateCw,
  Server,
  ShieldCheck,
  Trash2,
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

const ALL_DAYS = [
  { id: 'SUN', label: 'Sun', name: 'Sunday' },
  { id: 'MON', label: 'Mon', name: 'Monday' },
  { id: 'TUE', label: 'Tue', name: 'Tuesday' },
  { id: 'WED', label: 'Wed', name: 'Wednesday' },
  { id: 'THU', label: 'Thu', name: 'Thursday' },
  { id: 'FRI', label: 'Fri', name: 'Friday' },
  { id: 'SAT', label: 'Sat', name: 'Saturday' },
];

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

  // Scheduling State
  const [scheduleMode, setScheduleMode] = useState<'default' | 'custom'>(
    initialProject?.cron_expression && initialProject.cron_expression !== '30 3 * * SUN'
      ? 'custom'
      : 'default'
  );
  const [scheduleDays, setScheduleDays] = useState<string[]>(
    initialProject?.schedule_days && initialProject.schedule_days.length > 0
      ? initialProject.schedule_days
      : ['SUN']
  );
  const [scheduleHours, setScheduleHours] = useState<number[]>(
    initialProject?.schedule_hours && initialProject.schedule_hours.length > 0
      ? initialProject.schedule_hours
      : [9]
  );
  const [scheduleMinutes, setScheduleMinutes] = useState<number>(
    initialProject?.schedule_minutes ?? 0
  );
  const [scheduleTimezone, setScheduleTimezone] = useState<string>(
    initialProject?.schedule_timezone || 'Asia/Kolkata'
  );
  const [newTimeHour, setNewTimeHour] = useState<number>(21);

  if (!isOpen) return null;

  // Format 24h to 12h display
  const formatHourLabel = (h: number, m: number = 0) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m.toString().padStart(2, '0');
    return `${displayH}:${displayM} ${period}`;
  };

  // Compute UTC Cron string and plain description
  const computeScheduleDetails = () => {
    if (scheduleMode === 'default') {
      return {
        cron: '30 3 * * SUN',
        human: 'Runs every Sunday at 9:00 AM IST (03:30 AM UTC)',
        isDefault: true,
      };
    }

    const daysPart = scheduleDays.length === 7 || scheduleDays.length === 0 ? '*' : scheduleDays.join(',');
    const sortedHours = [...scheduleHours].sort((a, b) => a - b);

    // Calculate UTC hours and minutes
    let utcHList: number[] = [];
    let utcM = scheduleMinutes;

    if (scheduleTimezone === 'Asia/Kolkata') {
      // IST is UTC+05:30
      for (const h of sortedHours) {
        let totalMin = h * 60 + scheduleMinutes - 330;
        if (totalMin < 0) totalMin += 1440;
        utcHList.push(Math.floor(totalMin / 60));
        utcM = totalMin % 60;
      }
    } else {
      utcHList = sortedHours;
    }

    // Deduplicate
    utcHList = Array.from(new Set(utcHList)).sort((a, b) => a - b);
    const cron = `${utcM} ${utcHList.join(',')} * * ${daysPart}`;

    const daysText =
      scheduleDays.length === 7
        ? 'Every day (Daily)'
        : scheduleDays.map((d) => ALL_DAYS.find((item) => item.id === d)?.name || d).join(', ');

    const timesText = sortedHours.map((h) => formatHourLabel(h, scheduleMinutes)).join(', ');

    return {
      cron,
      human: `Runs ${daysText} at ${timesText} (${scheduleTimezone})`,
      isDefault: false,
    };
  };

  const currentSchedule = computeScheduleDetails();

  const handleToggleDay = (dayId: string) => {
    if (scheduleDays.includes(dayId)) {
      if (scheduleDays.length > 1) {
        setScheduleDays(scheduleDays.filter((d) => d !== dayId));
      }
    } else {
      setScheduleDays([...scheduleDays, dayId]);
    }
  };

  const handleAddHour = () => {
    if (!scheduleHours.includes(newTimeHour)) {
      setScheduleHours([...scheduleHours, newTimeHour].sort((a, b) => a - b));
    }
  };

  const handleRemoveHour = (h: number) => {
    if (scheduleHours.length > 1) {
      setScheduleHours(scheduleHours.filter((item) => item !== h));
    }
  };

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

    const projectPayload = {
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
      cron_expression: currentSchedule.cron,
      schedule_timezone: scheduleTimezone,
      schedule_days: scheduleDays,
      schedule_hours: scheduleHours,
      schedule_minutes: scheduleMinutes,
    };

    try {
      if (initialProject) {
        await api.updateProject(initialProject.id, projectPayload);
      } else {
        await api.createProject(projectPayload);
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              {initialProject ? 'Edit Project Configuration' : 'Register New Project'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Guided 5-step setup for scheduled health checks on Cloudflare Workers edge.
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

          {/* STEP 4: SCHEDULE (DEFAULT SUNDAY 9:00 AM OR CUSTOM MULTI-SCHEDULE) */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                  Select Execution Schedule
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {/* Default Option */}
                  <div
                    onClick={() => setScheduleMode('default')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      scheduleMode === 'default'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/5'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-sm text-slate-200">Default Sunday 9:00 AM</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        30 3 * * SUN
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Recommended baseline check every Sunday at 9:00 AM IST (03:30 UTC).
                    </p>
                  </div>

                  {/* Custom Option */}
                  <div
                    onClick={() => setScheduleMode('custom')}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      scheduleMode === 'custom'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/5'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-sm text-slate-200">Custom Multi-Schedule</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        Flexible
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Configure custom days, multiple run times per day, and custom intervals.
                    </p>
                  </div>
                </div>
              </div>

              {/* CUSTOM SCHEDULER PANEL */}
              {scheduleMode === 'custom' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 animate-fadeIn">
                  {/* Days Multi-Select */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-300">
                        Select Execution Days ({scheduleDays.length} selected)
                      </label>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setScheduleDays(['SUN'])}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          Sunday
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleDays(['SUN', 'THU'])}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          2x Week
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleDays(['MON', 'TUE', 'WED', 'THU', 'FRI'])}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          Weekdays
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleDays(ALL_DAYS.map((d) => d.id))}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          Daily
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {ALL_DAYS.map((day) => {
                        const isSelected = scheduleDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => handleToggleDay(day.id)}
                            className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Multiple Run Times per Day */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">
                      Execution Times ({scheduleHours.length} scheduled per day)
                    </label>

                    {/* Chips of scheduled hours */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {scheduleHours.map((h) => (
                        <span
                          key={h}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-900 border border-slate-700 text-slate-200"
                        >
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{formatHourLabel(h, scheduleMinutes)}</span>
                          {scheduleHours.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveHour(h)}
                              className="text-slate-400 hover:text-rose-400 ml-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>

                    {/* Add another time control */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">Add Time:</span>
                        <select
                          value={newTimeHour}
                          onChange={(e) => setNewTimeHour(parseInt(e.target.value, 10))}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                        >
                          {Array.from({ length: 24 }).map((_, i) => (
                            <option key={i} value={i}>
                              {formatHourLabel(i, scheduleMinutes)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddHour}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-emerald-400 flex items-center gap-1 border border-slate-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Run Time</span>
                      </button>
                    </div>
                  </div>

                  {/* Timezone Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Timezone
                      </label>
                      <select
                        value={scheduleTimezone}
                        onChange={(e) => setScheduleTimezone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                        <option value="UTC">UTC (Universal Time)</option>
                        <option value="America/New_York">America/New_York (EST - UTC-05:00)</option>
                        <option value="Europe/London">Europe/London (GMT/BST)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (PST - UTC-08:00)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Minute of the Hour
                      </label>
                      <select
                        value={scheduleMinutes}
                        onChange={(e) => setScheduleMinutes(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                      >
                        <option value={0}>:00 (Top of the hour)</option>
                        <option value={15}>:15</option>
                        <option value={30}>:30</option>
                        <option value={45}>:45</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* LIVE CALCULATED SCHEDULE SUMMARY */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Calculated Cloudflare Cron:</span>
                  <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {currentSchedule.cron}
                  </span>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{currentSchedule.human}</span>
                </div>
              </div>

              {/* Enable / Pause Toggle */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Enable Scheduled Runs</div>
                  <div className="text-xs text-slate-400">
                    Participate in automatic health checks on this schedule.
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

                <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Scheduled for: <strong className="text-slate-200">{currentSchedule.human}</strong></span>
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
