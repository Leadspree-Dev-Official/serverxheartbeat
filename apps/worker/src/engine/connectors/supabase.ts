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

    const fullUrl = `${baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(project.custom_headers || {}),
    };

    if (authSecret) {
      headers['apikey'] = authSecret;
      headers['Authorization'] = `Bearer ${authSecret}`;
    }

    return {
      url: fullUrl,
      method: project.http_method || 'GET',
      headers,
    };
  }
}
