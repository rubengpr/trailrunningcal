import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writingRequest } from '@/tests/fixtures/blog-writing';

const script = 'scripts/blog-writing/run.ts';

describe('writer preparation command', () => {
  it('prepares inspectable files without an API key and refuses overwriting an existing attempt', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'blog-writing-'));
    try {
      const input = join(directory, 'request.json');
      const output = join(directory, 'preview');
      await writeFile(input, JSON.stringify(writingRequest));
      const args = [
        '--import',
        'tsx',
        script,
        '--input',
        input,
        '--output',
        output,
      ];
      const env = { ...process.env, OPENAI_API_KEY: '' };
      const stdout = execFileSync(process.execPath, args, {
        encoding: 'utf8',
        env,
      });
      expect(stdout).toContain('No generation executed');
      expect(
        JSON.parse(await readFile(join(output, 'state.json'), 'utf8')),
      ).toMatchObject({ status: 'prepared', executed: false });
      const payload = JSON.parse(
        await readFile(join(output, 'input.json'), 'utf8'),
      );
      expect(payload.events).toHaveLength(5);
      expect(await readFile(join(output, 'instructions.md'), 'utf8')).toContain(
        '# Identidad',
      );
      expect(
        JSON.parse(await readFile(join(output, 'schema.json'), 'utf8'))
          .required,
      ).toHaveLength(7);
      await expect(stat(join(output, 'article.html'))).rejects.toThrow();
      expect(spawnSync(process.execPath, args, { env }).status).toBe(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('rejects incomplete context even if execution is requested', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'blog-writing-'));
    try {
      const input = join(directory, 'request.json');
      await writeFile(
        input,
        JSON.stringify({ ...writingRequest, events: [] }),
      );
      const result = spawnSync(
        process.execPath,
        ['--import', 'tsx', script, '--input', input, '--execute'],
        { encoding: 'utf8', env: { ...process.env, OPENAI_API_KEY: '' } },
      );
      expect(result.status).toBe(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
