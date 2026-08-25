import { readFile, writeFile } from 'node:fs/promises';
import {
  getEventTranslationCandidates,
  getEventTranslationCandidatesByIds,
  getPersistedEventTranslations,
  saveEventTranslations,
} from '@/lib/db/event-translations';
import {
  createEventTranslationArtifact,
  parseEventTranslationArtifact,
  type EventTranslationArtifact,
} from '@/lib/services/event-translation-artifact';
import {
  getGoldenTranslationCases,
  validateGoldenEventTranslation,
} from '@/lib/services/event-translation-golden';
import { promoteEventTranslationArtifact } from '@/lib/services/event-translation-promotion';
import {
  EventTranslationQualityError,
  generateValidatedEventTranslation,
  MAX_EVENT_TRANSLATION_ATTEMPTS,
} from '@/lib/services/event-translation-generation';
import { validateEventTranslation } from '@/lib/services/event-translations';
import {
  EVENT_TRANSLATION_LOCALES,
  type EventTranslationLocale,
} from '@/types/event-translation.types';

type GenerateOptions = {
  mode: 'generate';
  locales: EventTranslationLocale[];
  limit: number;
  all: boolean;
  outputFile: string;
};

type GoldenOptions = {
  mode: 'golden';
};

type PromoteOptions = {
  mode: 'promote';
  artifactFile: string;
};

type Options = GenerateOptions | GoldenOptions | PromoteOptions;

type TranslationResult = {
  eventId: string;
  slug: string;
  source: string;
  locale: EventTranslationLocale;
  description: string | null;
  attempts: number;
  error: string | null;
  lastTranslation: string | null;
};

const CONCURRENCY = 6;

function usage(): never {
  throw new Error(
    'Usage: --locales=ca,en,fr (--limit=20 | --all) --dry-run --output=review.md\n       --apply-from=artifact.json\n       --golden --locales=ca,en,fr --dry-run',
  );
}

function parseLocales(value: string | undefined): EventTranslationLocale[] {
  if (!value) usage();
  const locales = value.split(',').map((locale) => locale.trim());
  if (
    locales.length === 0 ||
    locales.some((locale) => !(EVENT_TRANSLATION_LOCALES as readonly string[]).includes(locale))
  ) {
    usage();
  }
  return Array.from(new Set(locales)) as EventTranslationLocale[];
}

function parseOptions(args: string[]): Options {
  const localesArg = args.find((arg) => arg.startsWith('--locales='));
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const outputArg = args.find((arg) => arg.startsWith('--output='));
  const applyFromArg = args.find((arg) => arg.startsWith('--apply-from='));
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');
  const golden = args.includes('--golden');

  if (applyFromArg) {
    if (args.length !== 1 || !applyFromArg.slice('--apply-from='.length)) usage();
    return { mode: 'promote', artifactFile: applyFromArg.slice('--apply-from='.length) };
  }

  const locales = parseLocales(localesArg?.slice('--locales='.length));
  if (golden) {
    if (!dryRun || all || limitArg || outputArg || locales.length !== EVENT_TRANSLATION_LOCALES.length) usage();
    return { mode: 'golden' };
  }

  if (!dryRun || (all && limitArg) || (!all && !limitArg) || !outputArg) usage();
  const limit = all ? 10_000 : Number(limitArg?.slice('--limit='.length));
  if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) usage();

  return {
    mode: 'generate',
    locales,
    limit,
    all,
    outputFile: outputArg.slice('--output='.length),
  };
}

function getArtifactPath(outputFile: string): string {
  return outputFile.endsWith('.md')
    ? `${outputFile.slice(0, -'.md'.length)}.json`
    : `${outputFile}.json`;
}

function formatReview(artifact: EventTranslationArtifact): string {
  return `# Event description translation dry run\n\n## Summary\n\n- Batch: ${artifact.batchId}\n- Expected: ${artifact.expected}\n- Valid: ${artifact.entries.length}\n- Failed: ${artifact.failures.length}\n\n${artifact.entries
    .map((entry) =>
      `## ${entry.slug} (${entry.locale})\n\n${entry.description}`,
    )
    .join('\n\n---\n\n')}${artifact.failures.length > 0 ? `\n\n## Failures\n\n${artifact.failures
      .map((failure) =>
        `### ${failure.slug} (${failure.locale})\n\n- Attempts: ${failure.attempts}\n- Error: ${failure.error}${failure.lastTranslation ? `\n\nLast output:\n\n${failure.lastTranslation}` : ''}`,
      )
      .join('\n\n')}` : ''}\n`;
}

async function translateWithQuality(input: {
  slug: string;
  source: string;
  locale: EventTranslationLocale;
}, validate: (input: {
  slug: string;
  source: string;
  translation: string;
  locale: EventTranslationLocale;
}) => { value: string | null; error: string | null } = validateEventTranslation): Promise<{
  description: string;
  attempts: number;
}> {
  return generateValidatedEventTranslation({
    source: input.source,
    locale: input.locale,
    validate: ({ source, translation, locale }) => validate({ ...input, source, translation, locale }),
  });
}

async function runGolden(): Promise<void> {
  const cases = getGoldenTranslationCases();
  let passed = 0;
  let failed = 0;

  async function runCase(testCase: (typeof cases)[number]): Promise<void> {
    try {
      await translateWithQuality(testCase, validateGoldenEventTranslation);
      passed += 1;
      console.log(`Passed ${testCase.slug} (${testCase.locale})`);
    } catch (error) {
      failed += 1;
      console.error(`Failed ${testCase.slug} (${testCase.locale}): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  for (let index = 0; index < cases.length; index += CONCURRENCY) {
    await Promise.all(cases.slice(index, index + CONCURRENCY).map(runCase));
  }
  console.log(`Completed golden dataset: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

async function generateBatch(options: GenerateOptions): Promise<void> {
  const events = await getEventTranslationCandidates(options.limit, options.locales);
  const tasks = events.flatMap((event) =>
    options.locales.map((locale) => async (): Promise<TranslationResult> => {
      try {
        const result = await translateWithQuality({ slug: event.slug, source: event.description, locale });
        console.log(`Validated ${event.slug} (${locale}) in ${result.attempts} attempt${result.attempts === 1 ? '' : 's'}`);
        return { eventId: event.id, slug: event.slug, source: event.description, locale, description: result.description, attempts: result.attempts, error: null, lastTranslation: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed ${event.slug} (${locale}): ${message}`);
        return { eventId: event.id, slug: event.slug, source: event.description, locale, description: null, attempts: MAX_EVENT_TRANSLATION_ATTEMPTS, error: message, lastTranslation: error instanceof EventTranslationQualityError ? error.lastTranslation : null };
      }
    }),
  );

  const results: TranslationResult[] = [];
  for (let index = 0; index < tasks.length; index += CONCURRENCY) {
    results.push(...await Promise.all(tasks.slice(index, index + CONCURRENCY).map((task) => task())));
  }

  const expected = events.length * options.locales.length;
  const artifact = createEventTranslationArtifact({
    locales: options.locales,
    expected,
    entries: results.flatMap((result) => result.description ? [{
      eventId: result.eventId,
      slug: result.slug,
      locale: result.locale,
      source: result.source,
      description: result.description,
      validation: { valid: true as const },
      generatedAt: new Date().toISOString(),
    }] : []),
    failures: results.flatMap((result) => result.error ? [{
      eventId: result.eventId,
      slug: result.slug,
      locale: result.locale,
      attempts: result.attempts,
      error: result.error,
      lastTranslation: result.lastTranslation,
    }] : []),
  });
  const artifactPath = getArtifactPath(options.outputFile);
  await Promise.all([
    writeFile(options.outputFile, formatReview(artifact), 'utf8'),
    writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8'),
  ]);
  console.log(`Saved review output to ${options.outputFile}`);
  console.log(`Saved promotion artifact to ${artifactPath}`);
  console.log(`Completed ${options.all ? 'all events' : `${events.length} events`}: ${artifact.entries.length} valid, ${artifact.failures.length} failed.`);
  if (artifact.failures.length > 0 || artifact.entries.length !== expected) process.exitCode = 1;
}

async function revalidate(slugs: string[]): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  const secret = process.env.REVALIDATION_SECRET;
  if (!siteUrl || !secret) throw new Error('Missing NEXT_PUBLIC_SITE_URL or REVALIDATION_SECRET');

  for (let index = 0; index < slugs.length; index += 100) {
    const response = await fetch(`${siteUrl}/api/internal/revalidate-events`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ slugs: slugs.slice(index, index + 100) }),
    });
    if (!response.ok) throw new Error('Failed to revalidate event pages');
  }
}

async function promoteArtifact(artifactFile: string): Promise<void> {
  const artifact = parseEventTranslationArtifact(JSON.parse(await readFile(artifactFile, 'utf8')));
  const result = await promoteEventTranslationArtifact({
    artifact,
    dependencies: {
      getEvents: getEventTranslationCandidatesByIds,
      saveTranslations: saveEventTranslations,
      getPersistedTranslations: getPersistedEventTranslations,
      revalidate,
    },
  });
  console.log(`Promoted batch ${result.batchId}: ${result.persisted} translations across ${result.slugs.length} events.`);
}

async function main(): Promise<void> {
  // pnpm forwards a literal `--` before user arguments. It is a package-manager
  // separator, not a script argument, and must not invalidate strict promotion mode.
  const options = parseOptions(process.argv.slice(2).filter((argument) => argument !== '--'));
  if (options.mode === 'golden') return runGolden();
  if (options.mode === 'promote') return promoteArtifact(options.artifactFile);
  return generateBatch(options);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
