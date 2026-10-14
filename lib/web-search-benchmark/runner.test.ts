import { execFileSync, spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';

const script = 'scripts/web-search-benchmark/run.ts';
describe('CLI safety and frozen dataset', () => {
  it('plans 90 jobs without starting provider requests', () => {
    const output = execFileSync(
      process.execPath,
      ['--import', 'tsx', script, '--mode', 'plan'],
      { encoding: 'utf8' },
    );
    const result = JSON.parse(output);
    expect(result.investigations).toBe(90);
    expect(result.networkRequests).toBe(0);
    expect(result.config.settings.model).toBe('gpt-6.1-sol');
    expect(
      new Set(result.config.jobs.map((job: { id: string }) => job.id)).size,
    ).toBe(90);
  });
  it('requires an explicit execution switch before even opening Braintrust', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', script, '--mode', 'smoke', '--run-id', 'test'],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Real calls require --execute');
  });
});
