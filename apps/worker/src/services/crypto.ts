/**
 * Secret Masking & Crypto Utilities
 */

/**
 * Masks a sensitive token or key for display
 * Example: 'eyJh...' -> 'eyJh***...b91c'
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return '';
  if (secret.length <= 8) return '********';
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}****${suffix}`;
}

/**
 * Sanitizes an error message so no sensitive tokens, query params, or URLs are leaked
 */
export function sanitizeErrorMessage(error?: any): string {
  if (!error) return 'Unknown error';
  const raw = typeof error === 'string' ? error : error.message || JSON.stringify(error);

  // Redact potential bearer tokens, jwt, passwords
  return raw
    .replace(/(bearer\s+)[a-zA-Z0-9_\-\.]+/gi, '$1[REDACTED]')
    .replace(/(apikey=)[a-zA-Z0-9_\-\.]+/gi, '$1[REDACTED]')
    .replace(/(key=)[a-zA-Z0-9_\-\.]+/gi, '$1[REDACTED]')
    .replace(/(secret=)[a-zA-Z0-9_\-\.]+/gi, '$1[REDACTED]');
}
