import { Project } from '@heartbeat/shared';
import { BaseConnector } from './base';

export class GenericConnector extends BaseConnector {
  providerName = 'generic';

  prepareRequest(project: Project, authSecret?: string): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    let baseUrl = project.base_url.replace(/\/+$/, '');
    let endpoint = (project.endpoint_path || '').trim();

    if (endpoint && !endpoint.startsWith('/')) {
      endpoint = `/${endpoint}`;
    }

    const fullUrl = `${baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': '*/*',
      ...(project.custom_headers || {}),
    };

    if (authSecret) {
      if (project.auth_type === 'bearer') {
        headers['Authorization'] = `Bearer ${authSecret}`;
      } else if (project.auth_type === 'basic') {
        headers['Authorization'] = `Basic ${btoa(authSecret)}`;
      } else if (project.auth_type === 'api_key') {
        headers['x-api-key'] = authSecret;
      }
    }

    return {
      url: fullUrl,
      method: project.http_method || 'GET',
      headers,
    };
  }
}
