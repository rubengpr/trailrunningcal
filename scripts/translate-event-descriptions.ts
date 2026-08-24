import {
  getEventTranslationCandidates,
  hasEventTranslation,
  saveEventTranslations,
} from '@/lib/db/event-translations';
import {
  getGoldenTranslationCases,
  validateGoldenEventTranslation,
} from '@/lib/services/event-translation-golden';
import {
  EventTranslationValidationError,
  translateEventDescription,
  validateEventTranslation,
} from '@/lib/services/event-translations';
import {
  EVENT_TRANSLATION_LOCALES,
  type EventTranslationLocale,
} from '@/types/event-translation.types';

type Options = {
  locales: EventTranslationLocale[];
  limit: number;
  apply: boolean;
  force: boolean;
  all: boolean;
  golden: boolean;
  outputFile: string | null;
};

type TranslationResult = {
  eventId: string;
  slug: string;
  locale: EventTranslationLocale;
  description: string | null;
  attempts: number;
  error: string | null;
  lastTranslation: string | null;
  skipped: boolean;
};

const MAX_QUALITY_ATTEMPTS = 3;

class TranslationQualityError extends Error {
  constructor(
    message: string,
    readonly lastTranslation: string | null,
  ) {
    super(message);
  }
}

function usage(): never {
  throw new Error(
    'Usage: --locales=ca,en,fr (--limit=20 | --all) [--dry-run | --apply] [--force] [--output=review.md]\n       A batch is persisted only when every requested translation validates.\n       --golden --locales=ca,en,fr --dry-run',
  );
}

function parseLocales(value: string | undefined): EventTranslationLocale[] {
  if (!value) usage();
  const locales = value.split(',').map((locale) => locale.trim());
  if (
    locales.length === 0 ||
    locales.some(
      (locale) =>
        !(EVENT_TRANSLATION_LOCALES as readonly string[]).includes(locale),
    )
  ) {
    usage();
  }
  return Array.from(new Set(locales)) as EventTranslationLocale[];
}

function parseOptions(args: string[]): Options {
  const localesArg = args.find((arg) => arg.startsWith('--locales='));
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const all = args.includes('--all');
  const apply = args.includes('--apply');
  const dryRun = args.includes('--dry-run');
  const golden = args.includes('--golden');
  const outputArg = args.find((arg) => arg.startsWith('--output='));
  const outputFile = outputArg?.slice('--output='.length) || null;

  const locales = parseLocales(localesArg?.slice('--locales='.length));
  if (golden) {
    if (
      !dryRun ||
      apply ||
      all ||
      limitArg ||
      locales.length !== EVENT_TRANSLATION_LOCALES.length
    ) {
      usage();
    }
    return {
      locales,
      limit: 0,
      apply: false,
      force: false,
      all: false,
      golden: true,
      outputFile: null,
    };
  }

  if (apply === dryRun || (all && limitArg) || (!all && !limitArg)) usage();
  if (apply && outputFile) usage();

  const limit = all
    ? 10_000
    : Number(limitArg?.slice('--limit='.length));
  if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) usage();

  return {
    locales,
    limit,
    apply,
    force: args.includes('--force'),
    all,
    golden: false,
    outputFile,
  };
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed ${testCase.slug} (${testCase.locale}): ${message}`);
    }
  }

  const concurrency = 6;
  for (let index = 0; index < cases.length; index += concurrency) {
    await Promise.all(cases.slice(index, index + concurrency).map(runCase));
  }

  console.log(`Completed golden dataset: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

async function revalidate(slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  const secret = process.env.REVALIDATION_SECRET;
  if (!siteUrl || !secret) {
    throw new Error('Missing NEXT_PUBLIC_SITE_URL or REVALIDATION_SECRET');
  }

  for (let index = 0; index < slugs.length; index += 100) {
    const response = await fetch(`${siteUrl}/api/internal/revalidate-events`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ slugs: slugs.slice(index, index + 100) }),
    });
    if (!response.ok) {
      throw new Error('Failed to revalidate event pages');
    }
  }
}

function formatReview(entries: Array<{
  slug: string;
  locale: EventTranslationLocale;
  description: string | null;
  attempts: number;
  error: string | null;
  skipped: boolean;
}>, expected: number): string {
  const completed = entries.filter((entry) => entry.description).length;
  const failed = entries.filter((entry) => entry.error);
  return `# Event description translation dry run\n\n## Summary\n\n- Expected: ${expected}\n- Valid: ${completed}\n- Skipped: ${entries.filter((entry) => entry.skipped).length}\n- Failed: ${failed.length}\n\n${entries
    .filter((entry) => entry.description)
    .map(({ slug, locale, description, attempts }) =>
      `## ${slug} (${locale}) — ${attempts} attempt${attempts === 1 ? '' : 's'}\n\n${description}`,
    )
    .join('\n\n---\n\n')}\n`;
}

function formatFailures(entries: TranslationResult[]): string {
  const failures = entries.filter((entry) => entry.error);
  if (failures.length === 0) return '';

  return `\n## Failures\n\n${failures
    .map(({ slug, locale, attempts, error, lastTranslation }) =>
      `### ${slug} (${locale})\n\n- Attempts: ${attempts}\n- Error: ${error}${lastTranslation ? `\n\nLast output:\n\n${lastTranslation}` : ''}`,
    )
    .join('\n\n')}`;
}

function getRepairInstructions(input: {
  attempt: number;
  error: string;
  locale: EventTranslationLocale;
  lastTranslation: string | null;
}): string[] {
  const instructions = [
    `This is quality repair attempt ${input.attempt}. The previous output failed this check: ${input.error}. Correct that issue while preserving every other fact and the exact two-paragraph structure.`,
  ];
  const missingTerm = input.error.match(/^Translation is missing required term: (.+)$/u)?.[1];

  if (missingTerm) {
    instructions.push(
      `The final description must include this exact target-language phrase: "${missingTerm}".`,
    );
  }
  if (input.error === 'Translation has an invalid language') {
    instructions.push(
      `Return every complete sentence in ${input.locale}; do not return Spanish sentences. Keep only proper names unchanged.`,
    );
  }
  if (input.lastTranslation) {
    instructions.push(
      `Do not repeat this invalid previous output:\n${input.lastTranslation}`,
    );
  }

  return instructions;
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
  let error = 'Translation did not pass the quality gate';
  let lastTranslation: string | null = null;

  for (let attempt = 1; attempt <= MAX_QUALITY_ATTEMPTS; attempt += 1) {
    try {
      const translation = await translateEventDescription({
        source: input.source,
        locale: input.locale,
        additionalInstructions: attempt === 1
          ? undefined
          : getRepairInstructions({ attempt, error, locale: input.locale, lastTranslation }),
      });
      lastTranslation = translation;
      const validation = validate({ ...input, translation });
      if (validation.value) return { description: validation.value, attempts: attempt };
      error = validation.error ?? error;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Unknown translation error';
      if (caught instanceof EventTranslationValidationError) {
        lastTranslation = caught.translation;
      }
    }
  }

  throw new TranslationQualityError(error, lastTranslation);
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.golden) {
    await runGolden();
    return;
  }
  const events = await getEventTranslationCandidates(options.limit);
  const tasks = events.flatMap((event) =>
    options.locales.map((locale) => async (): Promise<TranslationResult> => {
      try {
        if (!options.force && await hasEventTranslation({ eventId: event.id, locale })) {
          console.log(`Skipped ${event.slug} (${locale}): already translated`);
          return {
            eventId: event.id,
            slug: event.slug,
            locale,
            description: null,
            attempts: 0,
            error: null,
            lastTranslation: null,
            skipped: true,
          };
        }

        const result = await translateWithQuality({
          slug: event.slug,
          source: event.description,
          locale,
        });
        console.log(`Validated ${event.slug} (${locale}) in ${result.attempts} attempt${result.attempts === 1 ? '' : 's'}`);
        return {
          eventId: event.id,
          slug: event.slug,
          locale,
          description: result.description,
          attempts: result.attempts,
          error: null,
          lastTranslation: null,
          skipped: false,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed ${event.slug} (${locale}): ${message}`);
        return {
          eventId: event.id,
          slug: event.slug,
          locale,
          description: null,
          attempts: MAX_QUALITY_ATTEMPTS,
          error: message,
          lastTranslation:
            error instanceof TranslationQualityError ? error.lastTranslation : null,
          skipped: false,
        };
      }
    }),
  );

  const results: TranslationResult[] = [];
  const concurrency = 6;
  for (let index = 0; index < tasks.length; index += concurrency) {
    results.push(...await Promise.all(tasks.slice(index, index + concurrency).map((task) => task())));
  }

  const failures = results.filter((result) => result.error);
  const valid = results.filter((result) => result.description);
  const skipped = results.filter((result) => result.skipped);
  const expected = events.length * options.locales.length;

  if (!options.apply && options.outputFile) {
    await writeFile(
      options.outputFile,
      `${formatReview(results, expected)}${formatFailures(results)}\n`,
      'utf8',
    );
    console.log(`Saved review output to ${options.outputFile}`);
  }

  if (failures.length > 0) {
    console.error(`Batch blocked: ${failures.length} translation${failures.length === 1 ? '' : 's'} failed the quality gate.`);
    console.log(`Completed ${events.length} events: ${valid.length} valid, ${skipped.length} skipped, ${failures.length} failed.`);
    process.exitCode = 1;
    return;
  }

  if (options.apply) {
    await saveEventTranslations(valid.map(({ eventId, locale, description }) => ({
      eventId,
      locale,
      description: description as string,
    })));
    await revalidate([...new Set(valid.map(({ slug }) => slug))]);
    console.log(`Saved ${valid.length} translations in one batch.`);
  }

  console.log(
    `Completed ${options.all ? 'all events' : `${events.length} events`}: ${valid.length} valid, ${skipped.length} skipped, 0 failed.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
import { writeFile } from 'node:fs/promises';
