import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { randomUUID, createHash } from 'node:crypto';
import { getRecentIntroductions } from '@/lib/content/blog-introductions';
import { prepare } from '@/lib/blog/writing/context';
import { writingSchema } from '@/lib/blog/writing/schema';
import { articleWritingInstructions } from '@/lib/blog/prompts/article-writing';

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      'research-id': {type:'string'},
      output: { type: 'string' },
      execute: { type: 'boolean', default: false },
    },
  });
  if (Boolean(values.input) === Boolean(values['research-id'])) throw new Error('Provide exactly one of --input or --research-id');
  let value: unknown;
  if (values['research-id']) {
    if (new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname !== 'wghqldoshvwulyqqbqln.supabase.co') throw new Error('Research preparation is limited to trailrunningcal-local');
    const {parseUuidParam} = await import('@/app/api/request-validation');
    parseUuidParam(values['research-id'],'research id');
    const {fromResearch} = await import('@/lib/services/blog-writing-context');
    value = await fromResearch(values['research-id']);
  } else {
    const source = resolve(values.input!);
    if ((await stat(source)).size > 1_000_000) throw new Error('Input snapshot is too large');
    value = JSON.parse(await readFile(source,'utf8'));
  }
  const { request, input: preparedInput } = prepare(value);
  const input = { ...preparedInput, recentIntroductions: getRecentIntroductions() };
  if (values.execute && !process.env.OPENAI_API_KEY?.trim())
    throw new Error('OPENAI_API_KEY is required for execution');
  const directory = resolve(
    values.output ??
      join('scripts/.cache/blog-writing', `${Date.now()}-${randomUUID()}`),
  );
  await mkdir(dirname(directory), { recursive: true });
  // Never overwrite a previous run. Each directory is a frozen, inspectable attempt.
  await mkdir(directory, { mode: 0o700 });
  const save = (name: string, value: unknown) =>
    writeFile(join(directory, name), JSON.stringify(value, null, 2) + '\n', {
      mode: 0o600,
    });
  const text = (name: string, value: string) =>
    writeFile(join(directory, name), value, { mode: 0o600 });
  await save('request.json', request);
  await save('input.json', input);
  await text('instructions.md', articleWritingInstructions);
  await save('schema.json', writingSchema(input));
  const provenance = {
    createdAt: new Date().toISOString(),
    instructionsSha256: createHash('sha256')
      .update(articleWritingInstructions)
      .digest('hex'),
    inputSha256: createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex'),
  };
  await save('state.json', {
    ...provenance,
    status: 'prepared',
    executed: false,
  });
  console.log(`Prepared ${input.events.length} events. Files: ${directory}`);
  if (!values.execute) {
    console.log('No generation executed. Add --execute only when authorized.');
    return;
  }

  // Lazy import keeps the default preparation command free of provider/telemetry initialization.
  const { write } = await import('@/lib/services/blog-writing');
  const { writingOptions } =
    await import('@/lib/integrations/openai/article-writing');
  await save('state.json', {
    ...provenance,
    status: 'generating',
    executed: true,
    options: writingOptions,
  });
  try {
    const result = await write(request, (response) =>
      save('response.json', response),
    );
    await save('result.json', result);
    await save('quality.json', result.quality);
    await save('references.json', result.references);
    await text(
      'article.md',
      `# ${result.article.title}\n\n${result.article.contentMarkdown}\n`,
    );
    await text('article.html', result.contentHtml);
    await save('state.json', {
      ...provenance,
      status: 'completed',
      executed: true,
      options: writingOptions,
      responseId: result.responseId,
      model: result.model,
      usage: result.usage,
      durationMs: result.durationMs,
    });
    console.log(
      `Completed. Review article.md, article.html and references.json in ${directory}`,
    );
  } catch (error) {
    const { GenerationError } = await import('@/lib/blog/content');
    const { WritingError } = await import('@/lib/blog/writing/context');
    const code =
      error instanceof GenerationError || error instanceof WritingError
        ? error.code
        : 'internal_error';
    await save('state.json', {
      ...provenance,
      status: 'failed',
      executed: true,
      errorCode: code,
      options: writingOptions,
    });
    throw new Error(
      `Generation failed (${code}). Snapshot preserved in ${directory}`,
    );
  }
}

main().catch(() => {
  console.error(
    'Writer command failed. Check the input and any saved state.json; no automatic retry was made.',
  );
  process.exitCode = 1;
});
