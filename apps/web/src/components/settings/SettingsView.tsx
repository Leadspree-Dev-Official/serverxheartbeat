import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Cpu,
  Database,
  Lock,
  Mail,
  RotateCw,
  Save,
  Send,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { DISALLOWED_IP_RANGES, ENGINE_CONFIG, EmailConfig, EmailProviderType } from '@heartbeat/shared';
import { api } from '../../lib/api';

export const SettingsView: React.FC = () => {
  // Cloudflare & Supabase Credentials State
  const [cfAccountId, setCfAccountId] = useState('');
  const [cfWorkerName, setCfWorkerName] = useState('heartbeat-engine');
  const [cfToken, setCfToken] = useState('');
  const [supaUrl, setSupaUrl] = useState('');
  const [supaKey, setSupaKey] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Email Notification State
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailProvider, setEmailProvider] = useState<EmailProviderType>('resend');
  const [emailApiKey, setEmailApiKey] = useState('');
  const [emailFrom, setEmailFrom] = useState('Heartbeat Alerts <onboarding@resend.dev>');
  const [emailTo, setEmailTo] = useState('');
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [notifyOnScheduled, setNotifyOnScheduled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');

  // Test Email State
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Load persisted email settings
    api.getEmailConfig().then((cfg) => {
      if (cfg) {
        setEmailEnabled(cfg.enabled ?? false);
        setEmailProvider(cfg.provider || 'resend');
        setEmailApiKey(cfg.api_key || '');
        setEmailFrom(cfg.from_email || 'Heartbeat Alerts <onboarding@resend.dev>');
        setEmailTo(cfg.to_emails ? cfg.to_emails.join(', ') : 'admin@example.com');
        setNotifyOnFailure(cfg.notify_on_failure ?? true);
        setNotifyOnScheduled(cfg.notify_on_scheduled_summary ?? true);
        setWebhookUrl(cfg.webhook_url || '');
      }
    }).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const toList = emailTo
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    try {
      await api.updateEmailConfig({
        enabled: emailEnabled,
        provider: emailProvider,
        api_key: emailApiKey || undefined,
        from_email: emailFrom,
        to_emails: toList.length > 0 ? toList : ['admin@example.com'],
        notify_on_failure: notifyOnFailure,
        notify_on_scheduled_summary: notifyOnScheduled,
        webhook_url: webhookUrl || undefined,
      });

      setSavedMessage('Settings & Email Alerting configuration saved successfully.');
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    setTestEmailResult(null);

    const toList = emailTo
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    try {
      const res = await api.sendTestEmail({
        enabled: true,
        provider: emailProvider,
        api_key: emailApiKey || undefined,
        from_email: emailFrom,
        to_emails: toList.length > 0 ? toList : ['admin@example.com'],
        webhook_url: webhookUrl || undefined,
      });

      if (res.success) {
        setTestEmailResult({
          success: true,
          message: `Test email dispatched successfully! ${res.messageId ? `(ID: ${res.messageId})` : ''}`,
        });
      } else {
        setTestEmailResult({
          success: false,
          message: res.error || 'Failed to send test email. Check API key and recipient.',
        });
      }
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err.message || 'Error triggering test email',
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">System Settings &amp; Notifications</h2>
        <p className="text-sm text-slate-400">
          Manage email reporting, Cloudflare API credentials, and security policies.
        </p>
      </div>

      {savedMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{savedMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* EMAIL NOTIFICATIONS & AUTOMATED REPORTS */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Email Reporting &amp; Alerts</h3>
                <p className="text-xs text-slate-400">
                  Receive formatted health reports after scheduled runs and instant alerts on failure.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Email Provider</label>
                <select
                  value={emailProvider}
                  onChange={(e) => setEmailProvider(e.target.value as EmailProviderType)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="resend">Resend (Recommended for Cloudflare Workers)</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="webhook">Custom Webhook (Slack / Discord / Zapier)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Resend works natively via HTTP REST on edge workers with 3,000 free emails/mo.
                </p>
              </div>

              {emailProvider !== 'webhook' ? (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    {emailProvider === 'resend' ? 'Resend API Key' : 'SendGrid API Key'}
                  </label>
                  <input
                    type="password"
                    value={emailApiKey}
                    onChange={(e) => setEmailApiKey(e.target.value)}
                    placeholder="re_1234567890abcdef..."
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    API keys are stored securely server-side and masked in the browser.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Webhook URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">From Address</label>
                <input
                  type="text"
                  value={emailFrom}
                  onChange={(e) => setEmailFrom(e.target.value)}
                  placeholder="Heartbeat Alerts <onboarding@resend.dev>"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Use your verified domain or <code className="text-slate-400">onboarding@resend.dev</code> for testing.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Recipient Emails</label>
                <input
                  type="text"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="admin@mycompany.com, team@mycompany.com"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">Comma-separated list of recipient addresses.</p>
              </div>
            </div>

            {/* Notification Trigger Preferences */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
              <label className="text-slate-300 font-semibold block mb-2">Automated Report Triggers</label>
              
              <label className="flex items-center space-x-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={notifyOnScheduled}
                  onChange={(e) => setNotifyOnScheduled(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Send weekly Sunday health report summary after scheduled executions</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={notifyOnFailure}
                  onChange={(e) => setNotifyOnFailure(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Send immediate alert whenever an endpoint check fails or degrades</span>
              </label>
            </div>

            {/* Test Email Action */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Verify deliverability to <strong className="text-slate-200">{emailTo || 'recipients'}</strong>:
              </span>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTest}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors disabled:opacity-50"
              >
                {sendingTest ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>Sending Test Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-purple-400" />
                    <span>Send Test Email Now</span>
                  </>
                )}
              </button>
            </div>

            {testEmailResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  testEmailResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {testEmailResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testEmailResult.message}</span>
              </div>
            )}
          </div>
        </div>

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
                placeholder="e.g. d3b07384d113edec49eaa6238ad5ff00"
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
                placeholder="https://your-project.supabase.co"
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
