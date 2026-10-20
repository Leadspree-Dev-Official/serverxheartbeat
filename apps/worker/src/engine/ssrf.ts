/**
 * SSRF (Server-Side Request Forgery) Prevention Guard
 * Validates URLs and destinations before outbound health check requests.
 */

// Disallowed IP regex checks (IPv4 and IPv6)
const DISALLOWED_IPV4_PATTERNS = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,                // Loopback (127.0.0.0/8)
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,                 // Private Class A (10.0.0.0/8)
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,    // Private Class B (172.16.0.0/12)
  /^192\.168\.\d{1,3}\.\d{1,3}$/,                    // Private Class C (192.168.0.0/16)
  /^169\.254\.\d{1,3}\.\d{1,3}$/,                    // Link-local & Cloud Metadata (169.254.0.0/16)
  /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,                  // Current network (0.0.0.0/8)
  /^224\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,                // Multicast (224.0.0.0/4)
  /^240\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,                // Reserved (240.0.0.0/4)
];

const DISALLOWED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',
  'instance-data',
  'kubernetes.default.svc',
];

export interface SSRFValidationResult {
  valid: boolean;
  sanitizedUrl?: URL;
  error?: string;
}

/**
 * Validates a target URL against SSRF rules.
 * @param rawUrl The URL string to validate
 * @param allowHttp Optional parameter to allow HTTP in non-production environments
 */
export function validateUrlForSSRF(rawUrl: string, allowHttp: boolean = false): SSRFValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Target URL is required' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Protocol check
  const protocol = parsed.protocol.toLowerCase();
  if (protocol === 'http:' && !allowHttp) {
    return { valid: false, error: 'Insecure protocol: HTTP is not allowed in production. Use HTTPS.' };
  }
  if (!['https:', 'http:'].includes(protocol)) {
    return { valid: false, error: `Disallowed protocol "${protocol}". Only HTTPS is permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Strip enclosing brackets for IPv6
  const cleanHost = hostname.replace(/^\[|\]$/g, '');

  // Block forbidden known hostnames
  if (DISALLOWED_HOSTNAMES.includes(cleanHost)) {
    return { valid: false, error: `Forbidden target hostname: "${hostname}" is restricted (cloud metadata or internal).` };
  }

  // Check IPv4 forbidden patterns
  for (const pattern of DISALLOWED_IPV4_PATTERNS) {
    if (pattern.test(cleanHost)) {
      return { valid: false, error: `Forbidden target IP address: "${cleanHost}" belongs to a private, loopback, or metadata network.` };
    }
  }

  // Check IPv6 loopback / unique local / link local
  if (
    cleanHost === '::1' ||
    cleanHost === '0:0:0:0:0:0:0:1' ||
    cleanHost.startsWith('fc00:') ||
    cleanHost.startsWith('fd') ||
    cleanHost.startsWith('fe80:')
  ) {
    return { valid: false, error: `Forbidden target IPv6: "${cleanHost}" belongs to a private or link-local network.` };
  }

  // Port restrictions: Allow standard web ports 80, 443, 8080, 8443
  if (parsed.port) {
    const portNum = parseInt(parsed.port, 10);
    const allowedPorts = [80, 443, 8080, 8443];
    if (isNaN(portNum) || !allowedPorts.includes(portNum)) {
      return { valid: false, error: `Port ${parsed.port} is not in the allowed list of web ports (80, 443, 8080, 8443).` };
    }
  }

  return { valid: true, sanitizedUrl: parsed };
}
