import { describe, it, expect } from 'vitest';
import { executeHeartbeatBatch } from '../src/engine/runner';
import { getStorage } from '../src/services/supabase';

describe('Heartbeat Engine Runner', () => {
  it('skips disabled projects during batch runs', async () => {
    const storage = getStorage();

    // Create a disabled project
    const disabled = await storage.createProject({
      name: 'Disabled Test App',
      provider: 'generic',
      base_url: 'https://example.com',
      endpoint_path: '/health',
      enabled: false,
    });

    const activeProjects = await storage.getProjects(true);
    expect(activeProjects.some((p) => p.id === disabled.id)).toBe(false);
  });

  it('records execution results and sets overall run status', async () => {
    const storage = getStorage();

    // Create an active test project for runner validation
    await storage.createProject({
      name: 'Active Test App',
      provider: 'generic',
      base_url: 'https://httpbin.org',
      endpoint_path: '/status/200',
      expected_status_codes: [200],
      enabled: true,
    });

    const summary = await executeHeartbeatBatch(storage, {
      triggerType: 'manual',
      allowHttp: true,
      concurrency: 2,
    });

    expect(summary.run).toBeDefined();
    expect(summary.run.id).toBeDefined();
    expect(['success', 'partial', 'failed']).toContain(summary.run.status);
    expect(summary.results.length).toBeGreaterThan(0);

    for (const res of summary.results) {
      expect(res.run_id).toBe(summary.run.id);
      expect(res.response_time_ms).toBeGreaterThanOrEqual(0);
      expect(['success', 'warning', 'failed']).toContain(res.status);
    }
  });

  it('records every project result during concurrent execution without dropping any', async () => {
    const storage = getStorage();

    const p1 = await storage.createProject({
      name: 'Batch Test 1',
      provider: 'generic',
      base_url: 'https://httpbin.org',
      endpoint_path: '/status/200',
      expected_status_codes: [200],
      enabled: true,
    });
    const p2 = await storage.createProject({
      name: 'Batch Test 2',
      provider: 'generic',
      base_url: 'https://httpbin.org',
      endpoint_path: '/status/200',
      expected_status_codes: [200],
      enabled: true,
    });
    const p3 = await storage.createProject({
      name: 'Batch Test 3',
      provider: 'generic',
      base_url: 'https://httpbin.org',
      endpoint_path: '/status/200',
      expected_status_codes: [200],
      enabled: true,
    });

    const summary = await executeHeartbeatBatch(storage, {
      triggerType: 'manual',
      allowHttp: true,
      concurrency: 5,
    });

    const runDetails = await storage.getRunById(summary.run.id);
    expect(runDetails).toBeDefined();
    expect(runDetails?.results?.length).toBe(summary.run.total_projects);
    expect(summary.results.length).toBe(summary.run.total_projects);

    const checkedIds = summary.results.map((r) => r.project_id);
    expect(checkedIds).toContain(p1.id);
    expect(checkedIds).toContain(p2.id);
    expect(checkedIds).toContain(p3.id);
  });
});
