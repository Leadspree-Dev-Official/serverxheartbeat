import { Project, ResultStatus } from '@heartbeat/shared';
import { validateUrlForSSRF } from '../ssrf';

export interface HealthCheckResult {
  status: ResultStatus;
  httpStatus?: number;
  responseTimeMs: number;
  error?: string;
  headers?: Record<string, string>;
  message: string;
}

export interface ConnectorExecutionContext {
  allowHttp?: boolean;
  userAgent?: string;
}

/**
 * Base abstract connector with shared SSRF validation, timing, and least-privileged execution
 */
export abstract class BaseConnector {
  abstract providerName: string;

  /**
   * Builds the full target URL and headers for the health check
   */
  abstract prepareRequest(project: Project, authSecret?: string): {
    url: string;
    method: string;
    headers: Record<string, string>;
  };

  /**
   * Executes the health check against the target endpoint
   */
  async execute(
    project: Project,
    authSecret?: string,
    context: ConnectorExecutionContext = {}
  ): Promise<HealthCheckResult> {
    const { url, method, headers } = this.prepareRequest(project, authSecret);

    // SSRF Validation
    const ssrfCheck = validateUrlForSSRF(url, context.allowHttp);
    if (!ssrfCheck.valid) {
      return {
        status: 'failed',
        responseTimeMs: 0,
        error: `SSRF Blocked: ${ssrfCheck.error}`,
        message: `Endpoint destination failed SSRF safety checks.`,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), project.timeout_ms || 10000);

    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'User-Agent': context.userAgent || 'HeartbeatManager/1.0',
          ...headers,
        },
        signal: controller.signal,
        redirect: 'manual', // Prevent SSRF redirect bypass
      });

      const responseTimeMs = Date.now() - startTime;
      clearTimeout(timeoutId);

      const isExpected = (project.expected_status_codes || [200, 204]).includes(response.status);

      // Collect safe headers (do not leak sensitive server headers)
      const safeHeaders: Record<string, string> = {};
      const allowedHeaders = ['content-type', 'server', 'x-request-id', 'cf-ray', 'content-length'];
      for (const key of allowedHeaders) {
        const val = response.headers.get(key);
        if (val) safeHeaders[key] = val;
      }

      if (isExpected) {
        return {
          status: 'success',
          httpStatus: response.status,
          responseTimeMs,
          headers: safeHeaders,
          message: `Endpoint responded with expected HTTP ${response.status}`,
        };
      } else if (response.status >= 500) {
        return {
          status: 'failed',
          httpStatus: response.status,
          responseTimeMs,
          headers: safeHeaders,
          error: `HTTP ${response.status}: Server Error`,
          message: `Endpoint returned server error ${response.status}`,
        };
      } else {
        return {
          status: 'warning',
          httpStatus: response.status,
          responseTimeMs,
          headers: safeHeaders,
          error: `HTTP ${response.status}: Unexpected status code (expected ${JSON.stringify(project.expected_status_codes)})`,
          message: `Endpoint responded with unexpected HTTP ${response.status}`,
        };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      if (err.name === 'AbortError') {
        return {
          status: 'failed',
          responseTimeMs,
          error: `Request timed out after ${project.timeout_ms || 10000}ms`,
          message: 'Connection timed out waiting for server response.',
        };
      }

      return {
        status: 'failed',
        responseTimeMs,
        error: err.message || 'Unknown network error',
        message: `Network error: ${err.message || 'Failed to connect'}`,
      };
    }
  }
}
