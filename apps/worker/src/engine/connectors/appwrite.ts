import { Project } from '@heartbeat/shared';
import { BaseConnector } from './base';

export class AppwriteConnector extends BaseConnector {
  providerName = 'appwrite';

  prepareRequest(project: Project, authSecret?: string): {
    url: string;
    method: string;
    headers: Record<string, string>;
  } {
    let baseUrl = project.base_url.replace(/\/+$/, '');
    let endpoint = (project.endpoint_path || '').trim();

    if (!endpoint) {
      endpoint = '/v1/health';
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
      // In Appwrite, authSecret can be API key or Project ID
      headers['X-Appwrite-Project'] = authSecret;
      headers['X-Appwrite-Key'] = authSecret;
    }

    return {
      url: fullUrl,
      method: project.http_method || 'GET',
      headers,
    };
  }
}
