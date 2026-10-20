import { describe, it, expect } from 'vitest';
import { validateUrlForSSRF } from '../src/engine/ssrf';

describe('SSRF Protection Guard', () => {
  it('allows safe public HTTPS endpoints', () => {
    const res1 = validateUrlForSSRF('https://xyzcompany.supabase.co/rest/v1/');
    expect(res1.valid).toBe(true);

    const res2 = validateUrlForSSRF('https://cloud.appwrite.io/v1/health');
    expect(res2.valid).toBe(true);

    const res3 = validateUrlForSSRF('https://api.github.com');
    expect(res3.valid).toBe(true);
  });

  it('rejects loopback and localhost destinations', () => {
    const res1 = validateUrlForSSRF('http://localhost:3000');
    expect(res1.valid).toBe(false);

    const res2 = validateUrlForSSRF('https://127.0.0.1:8080');
    expect(res2.valid).toBe(false);

    const res3 = validateUrlForSSRF('https://127.12.34.56');
    expect(res3.valid).toBe(false);
  });

  it('rejects AWS and Cloud Metadata IPs (169.254.169.254)', () => {
    const res = validateUrlForSSRF('https://169.254.169.254/latest/meta-data/');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('metadata');

    const resHttp = validateUrlForSSRF('http://169.254.169.254/latest/meta-data/', true);
    expect(resHttp.valid).toBe(false);
    expect(resHttp.error).toContain('metadata');
  });

  it('rejects RFC1918 private network addresses', () => {
    // 10.0.0.0/8
    expect(validateUrlForSSRF('https://10.0.1.20').valid).toBe(false);
    // 172.16.0.0/12
    expect(validateUrlForSSRF('https://172.20.5.1').valid).toBe(false);
    // 192.168.0.0/16
    expect(validateUrlForSSRF('https://192.168.1.100').valid).toBe(false);
  });

  it('rejects disallowed non-standard ports', () => {
    const res = validateUrlForSSRF('https://example.com:22');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('allowed list of web ports');
  });

  it('rejects dangerous protocols (file:, ftp:, javascript:)', () => {
    expect(validateUrlForSSRF('file:///etc/passwd').valid).toBe(false);
    expect(validateUrlForSSRF('ftp://example.com').valid).toBe(false);
    expect(validateUrlForSSRF('javascript:alert(1)').valid).toBe(false);
  });
});
