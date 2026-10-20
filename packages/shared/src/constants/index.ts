export const DEFAULT_CRON_EXPRESSION = '30 3 * * SUN';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const PROVIDER_DEFAULTS = {
  supabase: {
    name: 'Supabase',
    defaultEndpoint: '/rest/v1/',
    defaultMethod: 'GET' as const,
    defaultAuthType: 'api_key' as const,
    authHeaderName: 'apikey',
    expectedCodes: [200, 204],
    description: 'Queries least-privilege REST endpoint without querying user data or running SQL.',
  },
  appwrite: {
    name: 'Appwrite',
    defaultEndpoint: '/v1/health/version',
    defaultMethod: 'GET' as const,
    defaultAuthType: 'none' as const,
    projectHeaderName: 'X-Appwrite-Project',
    expectedCodes: [200],
    description: 'Queries Appwrite health check endpoint without mutating project collections.',
  },
  generic: {
    name: 'Generic HTTP',
    defaultEndpoint: '/healthz',
    defaultMethod: 'GET' as const,
    defaultAuthType: 'none' as const,
    expectedCodes: [200],
    description: 'Configurable HTTP health check for generic services and webhooks.',
  },
} as const;

export const ENGINE_CONFIG = {
  DEFAULT_TIMEOUT_MS: 10000,
  MIN_TIMEOUT_MS: 1000,
  MAX_TIMEOUT_MS: 60000,
  DEFAULT_RETRY_COUNT: 2,
  MAX_RETRY_COUNT: 5,
  MAX_CONCURRENCY: 5,
  MAX_RESPONSE_BODY_BYTES: 64 * 1024, // 64KB max body read
  USER_AGENT: 'ServerXHeartBeat/1.0 (Cloudflare Worker Infrastructure Monitor)',
} as const;

export const DISALLOWED_IP_RANGES = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '127.0.0.0/8',
  '169.254.0.0/16', // AWS / Cloud metadata & Link-local
  '172.16.0.0/12',
  '192.168.0.0/16',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
];
