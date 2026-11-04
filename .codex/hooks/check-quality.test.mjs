import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

function runHook(t, { failure = '', retry = false, missingPnpm = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'trail-quality-hook-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const hooks = join(root, '.codex', 'hooks');
  const bin = join(root, 'bin');
  mkdirSync(hooks, { recursive: true });
  mkdirSync(bin);
  const script = join(hooks, 'check-quality.mjs');
  copyFileSync(new URL('./check-quality.mjs', import.meta.url), script);
  const log = join(root, 'calls.jsonl');
  writeFileSync(
    join(bin, 'pnpm'),
    `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TRAIL_HOOK_TEST_LOG,
  JSON.stringify({ args, cwd: process.cwd() }) + '\\n');
console.log('Mock check output');
process.exit(args[0] === process.env.TRAIL_HOOK_TEST_FAILURE ? 1 : 0);
`,
    { mode: 0o755 },
  );
  const result = spawnSync(process.execPath, [script], {
    cwd: tmpdir(),
    input: JSON.stringify({ stop_hook_active: retry }),
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: missingPnpm ? bin + '/missing' : `${bin}:${process.env.PATH}`,
      TRAIL_HOOK_TEST_LOG: log,
      TRAIL_HOOK_TEST_FAILURE: failure,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  const calls = missingPnpm
    ? []
    : readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
  return { output: JSON.parse(result.stdout), stderr: result.stderr, calls, root };
}

test('successful checks run from the repository root and return valid JSON', (t) => {
  const { output, stderr, calls, root } = runHook(t);
  assert.deepEqual(output, {});
  assert.deepEqual(calls, [
    { args: ['lint'], cwd: root },
    { args: ['tsc', '--noEmit'], cwd: root },
  ]);
  assert.match(stderr, /Mock check output/);
});

test('lint failure blocks completion and still runs TypeScript', (t) => {
  const { output, calls } = runHook(t, { failure: 'lint' });
  assert.equal(output.decision, 'block');
  assert.match(output.reason, /pnpm lint/);
  assert.equal(calls.length, 2);
});

test('TypeScript failure blocks completion independently of lint', (t) => {
  const { output } = runHook(t, { failure: 'tsc' });
  assert.equal(output.decision, 'block');
  assert.match(output.reason, /pnpm tsc --noEmit/);
});

test('retry reruns both checks and reports failure without another block', (t) => {
  const { output, calls } = runHook(t, { failure: 'lint', retry: true });
  assert.equal(output.decision, undefined);
  assert.match(output.systemMessage, /Validation has not passed/);
  assert.equal(calls.length, 2);
});

test('missing pnpm is a reported failure for both checks', (t) => {
  const { output, stderr } = runHook(t, { missingPnpm: true });
  assert.equal(output.decision, 'block');
  assert.match(output.reason, /pnpm lint, pnpm tsc --noEmit/);
  assert.match(stderr, /ENOENT/);
});
