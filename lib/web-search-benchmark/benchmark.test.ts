import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Response } from 'openai/resources/responses/responses';
import { dossierSchema } from '@/lib/blog/research/result';
import { research } from '@/lib/web-search-benchmark/research';
import { judge } from '@/lib/web-search-benchmark/judge';
import { evaluateReport } from '@/lib/web-search-benchmark/scoring';
import {
  plan,
  costs,
  publicUrl,
  sanitize,
} from '@/lib/web-search-benchmark/utils';
import { providers } from '@/lib/web-search-benchmark/config';
import { execute } from '@/lib/web-search-benchmark/execute';
import { load, resumeAction, lock } from '@/lib/web-search-benchmark/state';
import type {
  Checkpoint,
  DatasetRow,
  Event,
} from '@/types/web-search-benchmark.types';

const dossier = {
  eventName: 'Evento',
  context: 'Ocurre en un parque. [1]',
  sources: [{ title: 'Fuente', url: 'https://example.com/page' }],
  observations: [],
};
const result = {
  dossier,
  evidence: [
    { url: 'https://example.com/page', title: 'Fuente', content: 'Contenido' },
  ],
  sources: ['https://example.com/page'],
};
const basic = (status = 'correct', excerpt = 'Ocurre en un parque') => ({
  status,
  excerpt,
  reference: status === 'incorrect' ? 'en la sierra' : '',
  explanation: 'Etiqueta',
});
const level = (value = 'complete', errors: unknown[] = []) => ({
  level: value,
  explanation: 'Etiqueta',
  errors,
});
const report = {
  basics: {
    name: basic(),
    season: basic(),
    municipalities: basic(),
    provinces: basic(),
    zone: basic(),
  },
  criteria: {
    races: level(),
    route: level(),
    history: level(),
    elite: level(),
  },
};
const groundTruth = 'El evento ocurre en la sierra. Ganó Ana dos veces.';
const row: DatasetRow = {
  id: 'evento',
  input: { eventName: 'Evento', regionName: 'Aragón' },
  expected: { groundTruth, sources: [] },
  metadata: { ground_truth_sha256: 'hash' },
};
const prompt = { instructions: 'Investigate', schema: dossierSchema };
const signal = new AbortController().signal;
const reply = (output: unknown[], output_text = ''): Response =>
  ({ status: 'completed', output, output_text }) as Response;
const call = (name: string, args: unknown, id = 'c1') => ({
  type: 'function_call',
  name,
  arguments: JSON.stringify(args),
  call_id: id,
  id: 'fc1',
});
afterEach(() => vi.unstubAllEnvs());

describe('agent and judge', () => {
  it('searches, reads and returns a validated dossier, without leaking ground truth or cost', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(
        reply([
          {
            type: 'reasoning',
            id: 'reasoning-1',
            summary: [],
            encrypted_content: 'opaque-reasoning',
          },
          call('search', { query: 'Evento Aragón' }),
        ]),
      )
      .mockResolvedValueOnce(
        reply([call('read_page', { url: 'https://example.com/page' }, 'c2')]),
      )
      .mockResolvedValueOnce(reply([], JSON.stringify(dossier)));
    const adapter = {
      search: vi.fn().mockResolvedValue({
        sources: result.evidence,
        charge: { usd: 1, basis: 'reported' },
        errors: [],
      }),
      readPage: vi.fn().mockResolvedValue({
        sources: result.evidence,
        charge: { usd: 1, basis: 'reported' },
        errors: [],
      }),
    };
    expect(
      await research({
        provider: 'exa',
        input: row.input,
        prompt,
        complete,
        adapter,
        record: vi.fn(),
        signal,
      }),
    ).toEqual(result);
    expect(adapter.search).toHaveBeenCalledOnce();
    expect(adapter.readPage).toHaveBeenCalledOnce();
    for (const [params] of complete.mock.calls) {
      expect(params.model).toBe('gpt-6.1-sol');
      expect(params.include).toContain('reasoning.encrypted_content');
      expect(JSON.stringify(params)).not.toContain('groundTruth');
      expect(JSON.stringify(params.input)).not.toContain('charge');
    }
    expect(complete.mock.calls[0][0].tool_choice).toEqual({
      type: 'function',
      name: 'search',
    });
  });
  it('will not read an invented URL and can continue after a tool error', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(reply([call('search', { query: 'Evento' })]))
      .mockResolvedValueOnce(
        reply([call('read_page', { url: 'http://localhost/x' }, 'c2')]),
      )
      .mockResolvedValueOnce(reply([], JSON.stringify(dossier)));
    const adapter = {
      search: vi
        .fn()
        .mockResolvedValue({ sources: result.evidence, errors: [] }),
      readPage: vi.fn(),
    };
    await research({
      provider: 'exa',
      input: row.input,
      prompt,
      complete,
      adapter,
      record: vi.fn(),
      signal,
    });
    expect(adapter.readPage).not.toHaveBeenCalled();
  });
  it('fails instead of accepting a dossier when every search errored', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(reply([call('search', { query: 'Evento' })]))
      .mockResolvedValueOnce(reply([], JSON.stringify(dossier)));
    const adapter = {
      search: vi.fn().mockRejectedValue(new Error('Provider HTTP 402')),
      readPage: vi.fn(),
    };
    await expect(
      research({
        provider: 'exa',
        input: row.input,
        prompt,
        complete,
        adapter,
        record: vi.fn(),
        signal,
      }),
    ).rejects.toThrow('Every search failed');
  });
  it('records native searches and validates returned source URLs', async () => {
    const record = vi.fn();
    const complete = vi.fn().mockResolvedValue(
      reply(
        [
          {
            type: 'web_search_call',
            action: {
              type: 'search',
              sources: [{ type: 'url', url: 'https://example.com/page' }],
            },
          },
        ],
        JSON.stringify(dossier),
      ),
    );
    const output = await research({
      provider: 'openai',
      input: row.input,
      prompt,
      complete,
      record,
      signal,
    });
    expect(output.evidence).toEqual([]);
    expect(output.dossier).toEqual(dossier);
    expect(record.mock.calls[0][0].charge.usd).toBe(0.01);
    expect(costs(record.mock.calls.map(([e]) => e)).totalUsd).toBeNull();
  });
  it.each(['no search', 'incomplete', 'refusal', 'unverified source'])(
    'rejects %s without repair calls',
    async (kind) => {
      const response =
        kind === 'incomplete'
          ? { ...reply([]), status: 'incomplete' }
          : kind === 'refusal'
            ? reply([
                {
                  type: 'message',
                  content: [{ type: 'refusal', refusal: 'No' }],
                },
              ])
            : kind === 'unverified source'
              ? reply(
                  [
                    {
                      type: 'web_search_call',
                      action: { type: 'search', sources: [] },
                    },
                  ],
                  JSON.stringify(dossier),
                )
              : reply([], JSON.stringify(dossier));
      const complete = vi.fn().mockResolvedValue(response);
      await expect(
        research({
          provider: 'openai',
          input: row.input,
          prompt,
          complete,
          record: vi.fn(),
          signal,
        }),
      ).rejects.toThrow();
      expect(complete).toHaveBeenCalledOnce();
    },
  );
  it('uses a blind payload and one direct Responses call for the judge', async () => {
    const complete = vi
      .fn()
      .mockResolvedValue(reply([], JSON.stringify(report)));
    expect((await judge(row, result, prompt, complete, signal)).quality).toBe(
      100,
    );
    const params = complete.mock.calls[0][0];
    expect(params.reasoning.effort).toBe('medium');
    expect(params.tools).toBeUndefined();
    const payload = JSON.parse(params.input);
    expect(Object.keys(payload)).toEqual(['input', 'output', 'expected']);
    expect(Object.keys(payload.output)).toEqual(['dossier']);
  });
});

describe('rubric and schedule', () => {
  it('creates exactly 90 deterministic unique shuffled jobs', () => {
    const rows = ['a', 'b', 'c', 'd', 'e', 'f'];
    const jobs = plan(rows, providers, 3, 42, 'v1');
    expect(jobs).toHaveLength(90);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(90);
    expect(plan(rows, providers, 3, 42, 'v1')).toEqual(jobs);
    expect(plan(rows, providers, 3, 43, 'v1')).not.toEqual(jobs);
    for (const p of providers)
      expect(jobs.filter((j) => j.provider === p)).toHaveLength(18);
  });
  it('discards only on proven basic errors and penalizes missing ones', () => {
    const score = (patch: object) =>
      evaluateReport({ ...report, ...patch }, dossier, groundTruth);
    expect(score({})).toMatchObject({ publishable: true, quality: 100 });
    const wrong = score({
      basics: { ...report.basics, provinces: basic('incorrect') },
    });
    expect(wrong).toMatchObject({
      publishable: false,
      quality: null,
      discarded: ['provinces'],
    });
    // Unverifiable quotes downgrade the label to missing instead of discarding.
    const unproven = score({
      basics: {
        ...report.basics,
        provinces: basic('incorrect', 'Inventado'),
        zone: basic('correct', 'Inventado'),
      },
    });
    expect(unproven).toMatchObject({
      publishable: true,
      missing: ['provinces', 'zone'],
      quality: 90,
    });
    expect(
      score({ basics: { ...report.basics, season: basic('missing', '') } })
        .quality,
    ).toBe(95);
    expect(() => score({ criteria: { ...report.criteria, races: 1 } })).toThrow();
  });
  it('weights criteria and applies proven errors within their criterion', () => {
    const error = {
      excerpt: 'Ocurre en un parque',
      reference: 'Ganó Ana dos veces',
      explanation: 'Contradicción',
    };
    const score = (criteria: object) =>
      evaluateReport(
        { ...report, criteria: { ...report.criteria, ...criteria } },
        dossier,
        groundTruth,
      );
    expect(
      score({ history: level('partial'), races: level('absent') }).points,
    ).toEqual({ races: 0, route: 30, history: 12.5, elite: 10 });
    expect(score({ route: level('complete', [error]) }).points.route).toBe(
      15,
    );
    expect(score({ elite: level('complete', [error]) }).points.elite).toBe(0);
    expect(
      score({
        elite: level('complete', [{ ...error, reference: 'Inventado' }]),
      }).points.elite,
    ).toBe(10);
  });
  it('does not treat unavailable costs as zero and redacts credentials recursively', () => {
    const events = [
      { type: 'llm', charge: { usd: 0.2, basis: 'published-rate' } },
      { type: 'search', charge: { usd: null, basis: 'unknown' } },
    ] as Event[];
    expect(costs(events)).toMatchObject({
      totalUsd: null,
      knownSubtotalUsd: 0.2,
    });
    vi.stubEnv('EXA_API_KEY', 'secret-test-value');
    expect(sanitize({ nested: ['secret-test-value'] })).toEqual({
      nested: ['[REDACTED]'],
    });
    expect(sanitize(undefined)).toBeNull();
    for (const url of [
      'http://127.0.0.1',
      'https://a.local',
      'file:///tmp/a',
      'https://user:pass@example.com',
    ])
      expect(() => publicUrl(url)).toThrow();
  });
});

describe('checkpoints', () => {
  it('persists independent phases, skips completed calls and resumes only a completed research', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'benchmark-'));
    const path = join(dir, 'job.json');
    try {
      const job = plan(['a'], ['exa'], 1, 1, 'test')[0];
      const state: Checkpoint = {
        job,
        stage: 'prepared',
        fingerprint: 'hash',
        events: [],
        judgeEvents: [],
        rootSpanId: job.id,
      };
      const dependencies = {
        research: vi.fn().mockResolvedValue(result),
        evaluate: vi.fn().mockResolvedValue(report),
      };
      await execute(state, path, dependencies);
      expect((await load(path))?.stage).toBe('completed');
      await execute(state, path, dependencies);
      expect(dependencies.research).toHaveBeenCalledOnce();
      expect(dependencies.evaluate).toHaveBeenCalledOnce();
      const researched = {
        ...state,
        stage: 'researched' as const,
        report: undefined,
      };
      await execute(researched, path, dependencies);
      expect(dependencies.research).toHaveBeenCalledOnce();
      expect(dependencies.evaluate).toHaveBeenCalledTimes(2);
      const interrupted = { ...state, stage: 'researching' as const };
      await execute(interrupted, path, dependencies);
      expect(interrupted.stage).toBe('interrupted');
      expect(dependencies.research).toHaveBeenCalledOnce();
      expect(resumeAction(null)).toBe('research');
      const release = await lock(dir);
      await expect(lock(dir)).rejects.toThrow('lock');
      await release();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it('keeps the dossier when the judge fails', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'benchmark-'));
    try {
      const job = plan(['a'], ['exa'], 1, 1, 'test')[0];
      const state: Checkpoint = {
        job,
        stage: 'prepared',
        fingerprint: 'hash',
        events: [],
        judgeEvents: [],
        rootSpanId: job.id,
      };
      await execute(state, join(dir, 'job.json'), {
        research: vi.fn().mockResolvedValue(result),
        evaluate: vi.fn().mockRejectedValue(new Error('failed')),
      });
      expect(state).toMatchObject({
        stage: 'failed',
        failurePhase: 'evaluation',
        result,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
