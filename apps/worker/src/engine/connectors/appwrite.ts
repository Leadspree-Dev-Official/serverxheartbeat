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
      endpoint = '/v1/health/version';
    }
    if (!endpoint.startsWith('/')) {
      endpoint = `/${endpoint}`;
    }

    const fullUrl = `${baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(project.custom_headers || {}),
    };

    if (project.custom_headers?.['X-Appwrite-Project']) {
      headers['X-Appwrite-Project'] = project.custom_headers['X-Appwrite-Project'];
    }

    if (project.auth_type !== 'none' && authSecret && authSecret.trim()) {
      const secret = authSecret.trim();
      // When X-Appwrite-Project is already configured, authSecret represents the Secret API Key
      if (headers['X-Appwrite-Project']) {
        headers['X-Appwrite-Key'] = secret;
      } else {
        // Fallback if no separate Project ID was provided
        if (project.auth_type === 'bearer') {
          headers['X-Appwrite-Key'] = secret;
        } else {
          headers['X-Appwrite-Project'] = secret;
        }
      }
    }

    return {
      url: fullUrl,
      method: project.http_method || 'GET',
      headers,
    };
  }
}
