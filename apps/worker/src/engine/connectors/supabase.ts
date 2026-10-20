import { Project } from '@heartbeat/shared';
import { BaseConnector } from './base';

export class SupabaseConnector extends BaseConnector {
  providerName = 'supabase';

  prepareRequest(project: Project, authSecret?: string): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    let baseUrl = project.base_url.replace(/\/+$/, '');
    let endpoint = (project.endpoint_path || '').trim();

    if (!endpoint) {
      endpoint = '/rest/v1/';
    }
    if (!endpoint.startsWith('/')) {
      endpoint = `/${endpoint}`;
    }
    if (endpoint === '/rest/v1') {
      endpoint = '/rest/v1/';
    }

    let fullUrl = `${baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(project.custom_headers || {}),
    };

    const cleanSecret = (authSecret || '').replace(/[^\x20-\x7E]/g, '').trim();

    if (cleanSecret) {
      headers['apikey'] = cleanSecret;
      headers['Authorization'] = `Bearer ${cleanSecret}`;
      const sep = fullUrl.includes('?') ? '&' : '?';
      fullUrl = `${fullUrl}${sep}apikey=${encodeURIComponent(cleanSecret)}`;
    }

    return {
      url: fullUrl,
      method: project.http_method || 'GET',
      headers,
    };
  }
}
