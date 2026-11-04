import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const input = JSON.parse(readFileSync(0, 'utf8'));
const cwd = fileURLToPath(new URL('../../', import.meta.url));
const checks = [
  ['lint'],
  ['tsc', '--noEmit'],
];
const failures = [];

for (const args of checks) {
  const label = `pnpm ${args.join(' ')}`;
  process.stderr.write(`\nRunning ${label}\n`);
  const result = spawnSync('pnpm', args, {
    cwd,
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024,
    shell: process.platform === 'win32',
  });

  process.stderr.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error || result.status !== 0) {
    failures.push(label);
    process.stderr.write(
      `${label} failed: ${result.error?.message || result.signal || `exit ${result.status}`}\n`,
    );
  }
}

let output = {};
if (failures.length > 0) {
  const summary = `Quality checks failed: ${failures.join(', ')}.`;
  if (input.stop_hook_active) {
    // One continuation is enough: pre-existing failures must not cause a loop.
    output = {
      systemMessage: `${summary} The checks were rerun after a correction attempt and still fail. Validation has not passed; report the remaining failures or environment blockers.`,
    };
  } else {
    output = {
      decision: 'block',
      reason: `${summary} Review the hook output and fix failures introduced by your changes. The Stop hook will rerun both checks. If a failure is pre-existing or cannot be resolved within this task, report it explicitly in the final response; do not claim validation passed.`,
    };
  }
}

process.stdout.write(`${JSON.stringify(output)}\n`);
