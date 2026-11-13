import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writingRequest, writingResponse } from '@/tests/fixtures/blog-writing';

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
        '# Encargo',
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


describe('writer execution artifacts without network', () => {
  it.each([false,true])('persists quality or preserves structurally invalid output (invalid=%s)',async invalid => {
    const directory = await mkdtemp(join(tmpdir(),'blog-writing-execution-'));
    try {
      const input = join(directory,'request.json');
      const output = join(directory,'result');
      const preload = join(directory,'provider.mjs');
      const calls = join(directory,'calls.txt');
      const responsePath = join(directory,'provider.json');
      const value = structuredClone(writingResponse);
      if (invalid) value.contentMarkdown = value.contentMarkdown.split('## Elige tu próximo evento')[0];
      const provider = {id:'offline-response',object:'response',created_at:0,status:'completed',model:'gpt-6.1-sol',
        output:[{id:'message',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:JSON.stringify(value),annotations:[]}]}]};
      await writeFile(input,JSON.stringify(writingRequest));
      await writeFile(responsePath,JSON.stringify(provider));
      await writeFile(preload,`
        import {readFileSync,appendFileSync} from 'node:fs';
        const response = readFileSync(process.env.WRITING_TEST_RESPONSE,'utf8');
        globalThis.fetch = async () => {
          appendFileSync(process.env.WRITING_TEST_CALLS,'request\\n');
          return new Response(response,{status:200,headers:{'content-type':'application/json'}});
        };
      `);
      const command = spawnSync(process.execPath,['--import',preload,'--import','tsx',script,'--input',input,'--output',output,'--execute'],{
        encoding:'utf8',timeout:15_000,
        env:{...process.env,OPENAI_API_KEY:'offline-test',OPENAI_BASE_URL:'https://api.openai.com/v1',
          LANGFUSE_PUBLIC_KEY:'',LANGFUSE_SECRET_KEY:'',LATITUDE_API_KEY:'',
          WRITING_TEST_RESPONSE:responsePath,WRITING_TEST_CALLS:calls},
      });
      expect(command.status,command.stderr).toBe(invalid ? 1 : 0);
      expect((await readFile(calls,'utf8')).trim().split('\n')).toHaveLength(1);
      expect(JSON.parse(await readFile(join(output,'response.json'),'utf8')).id).toBe(provider.id);
      const state = JSON.parse(await readFile(join(output,'state.json'),'utf8'));
      expect(state.status).toBe(invalid ? 'failed' : 'completed');
      if (invalid) {
        expect(state.errorCode).toBe('invalid_content');
        await expect(stat(join(output,'quality.json'))).rejects.toThrow();
      } else {
        const report = JSON.parse(await readFile(join(output,'quality.json'),'utf8'));
        expect(report.observations.length).toBeGreaterThan(0);
        expect(JSON.parse(await readFile(join(output,'result.json'),'utf8')).quality).toEqual(report);
      }
    } finally { await rm(directory,{recursive:true,force:true}); }
  },20_000);
});
