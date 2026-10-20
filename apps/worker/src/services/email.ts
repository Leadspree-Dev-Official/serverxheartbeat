import { EmailConfig, HeartbeatRun, HeartbeatResult, SendEmailResult } from '@heartbeat/shared';
import { sanitizeErrorMessage } from './crypto';

export class EmailService {
  constructor(private config: EmailConfig) {}

  /**
   * Generates a sleek, responsive HTML email report for a heartbeat run
   */
  generateHtmlReport(run: HeartbeatRun, results: HeartbeatResult[]): string {
    const isSuccess = run.status === 'success';
    const isPartial = run.status === 'partial';

    const statusColor = isSuccess ? '#10b981' : isPartial ? '#f59e0b' : '#f43f5e';
    const statusBg = isSuccess ? '#ecfdf5' : isPartial ? '#fffbeb' : '#fff1f2';
    const statusBorder = isSuccess ? '#a7f3d0' : isPartial ? '#fde68a' : '#fecdd3';

    const rows = results
      .map((r) => {
        const itemSuccess = r.status === 'success';
        const itemWarn = r.status === 'warning';
        const itemColor = itemSuccess ? '#10b981' : itemWarn ? '#f59e0b' : '#f43f5e';
        const itemBg = itemSuccess ? '#f0fdf4' : itemWarn ? '#fefce8' : '#fef2f2';

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">
              ${r.project_name || r.project_id}
              <div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">
                ${r.provider?.toUpperCase() || 'HTTP'}
              </div>
            </td>
            <td style="padding: 12px 16px; font-family: monospace; color: #334155;">
              HTTP ${r.http_status ?? 'ERR'}
            </td>
            <td style="padding: 12px 16px; font-family: monospace; color: #0284c7;">
              ${r.response_time_ms}ms
            </td>
            <td style="padding: 12px 16px; text-align: right;">
              <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${itemColor}; background-color: ${itemBg}; border: 1px solid ${itemColor}33;">
                ${r.status}
              </span>
              ${
                r.error_summary
                  ? `<div style="font-size: 11px; color: #e11d48; margin-top: 4px; font-family: monospace; text-align: right;">${r.error_summary}</div>`
                  : ''
              }
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Heartbeat Health Report</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <div style="padding: 24px; background: linear-gradient(135deg, #0f172a, #1e293b); color: #ffffff;">
              <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #34d399;">
                Heartbeat Manager • Cloud Infrastructure
              </div>
              <h1 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700;">
                Heartbeat Execution Report
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">
                ${new Date(run.started_at).toLocaleString()} • Trigger: ${run.trigger_type.toUpperCase()}
              </p>
            </div>

            <!-- Run Status Banner -->
            <div style="padding: 16px 24px; background-color: ${statusBg}; border-bottom: 1px solid ${statusBorder};">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; font-weight: 700; color: ${statusColor}; text-transform: uppercase;">
                  Outcome: ${run.status}
                </span>
                <span style="font-size: 12px; color: #475569; font-weight: 600;">
                  ${run.successful_count} of ${run.total_projects} endpoints healthy
                </span>
              </div>
              ${
                run.error_summary
                  ? `<div style="margin-top: 6px; font-size: 12px; color: #b91c1c;">${run.error_summary}</div>`
                  : ''
              }
            </div>

            <!-- Endpoint Table -->
            <div style="padding: 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                <thead>
                  <tr style="background-color: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
                    <th style="padding: 10px 16px;">Endpoint</th>
                    <th style="padding: 10px 16px;">Status</th>
                    <th style="padding: 10px 16px;">Latency</th>
                    <th style="padding: 10px 16px; text-align: right;">Result</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>

            <!-- Notice & Footer -->
            <div style="padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 8px 0;">
                <strong>Notice:</strong> Periodic health checks verify endpoint availability. They do not override provider account restrictions, terms of service, or guarantee immunity from inactivity pauses where provider terms dictate.
              </p>
              <p style="margin: 0; color: #94a3b8;">
                Dispatched from Cloudflare Worker Engine • Scheduled Sunday Runner
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Dispatches the email via Resend, SendGrid, or Webhook
   */
  async sendReport(subject: string, htmlContent: string): Promise<SendEmailResult> {
    const { enabled, provider, api_key, from_email, to_emails, webhook_url } = this.config;

    if (!enabled) {
      return { success: false, error: 'Email alerts are disabled in settings' };
    }

    if (!to_emails || to_emails.length === 0) {
      return { success: false, error: 'No recipient email addresses configured' };
    }

    // 1. Resend API Dispatch (Default & recommended for Cloudflare Workers)
    if (provider === 'resend') {
      if (!api_key) {
        console.log(`[Email Simulation] Would send email via Resend to ${to_emails.join(', ')}: ${subject}`);
        return {
          success: true,
          messageId: 'simulated_resend_id_' + Date.now(),
        };
      }

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: from_email || 'Heartbeat Manager <onboarding@resend.dev>',
            to: to_emails,
            subject,
            html: htmlContent,
          }),
        });

        const data: any = await response.json();
        if (!response.ok) {
          return { success: false, error: sanitizeErrorMessage(data?.message || `Resend HTTP error ${response.status}`) };
        }

        return { success: true, messageId: data.id };
      } catch (err: any) {
        return { success: false, error: sanitizeErrorMessage(err.message) };
      }
    }

    // 2. SendGrid Dispatch
    if (provider === 'sendgrid') {
      if (!api_key) {
        return { success: false, error: 'SendGrid API key is required' };
      }

      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: to_emails.map((e) => ({ email: e })) }],
            from: { email: from_email || 'alerts@heartbeat.local' },
            subject,
            content: [{ type: 'text/html', value: htmlContent }],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return { success: false, error: sanitizeErrorMessage(errText || `SendGrid error ${response.status}`) };
        }

        return { success: true, messageId: 'sendgrid_' + Date.now() };
      } catch (err: any) {
        return { success: false, error: sanitizeErrorMessage(err.message) };
      }
    }

    // 3. Webhook Dispatch (e.g. Slack, Discord, Zapier, n8n)
    if (provider === 'webhook') {
      if (!webhook_url) {
        return { success: false, error: 'Webhook URL is required' };
      }

      try {
        const response = await fetch(webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'heartbeat_report',
            subject,
            recipients: to_emails,
            html: htmlContent,
            timestamp: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          return { success: false, error: `Webhook returned status ${response.status}` };
        }

        return { success: true, messageId: 'webhook_' + Date.now() };
      } catch (err: any) {
        return { success: false, error: sanitizeErrorMessage(err.message) };
      }
    }

    return { success: false, error: `Unsupported provider: ${provider}` };
  }
}
