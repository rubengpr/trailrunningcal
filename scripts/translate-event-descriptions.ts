import {
  getEventTranslationCandidates,
  hasEventTranslation,
  saveEventTranslation,
} from '@/lib/db/event-translations';
import {
  getGoldenTranslationCases,
  validateGoldenEventTranslation,
} from '@/lib/services/event-translation-golden';
import {
  EventTranslationValidationError,
  translateEventDescription,
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

function usage(): never {
  throw new Error(
    'Usage: --locales=ca,en,fr (--limit=20 | --all) [--dry-run | --apply] [--force] [--output=review.md]\n       --golden --locales=ca,en,fr --dry-run',
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

  async function translateWithGoldenQuality(input: {
    slug: string;
    source: string;
    locale: EventTranslationLocale;
  }): Promise<string> {
    let translation = await translateEventDescription({
      source: input.source,
      locale: input.locale,
    });
    let validation = validateGoldenEventTranslation({ ...input, translation });
    if (!validation.value) {
      translation = await translateEventDescription({
        source: input.source,
        locale: input.locale,
        additionalInstructions: [
          `This is a quality correction. Your previous translation failed this required check: ${validation.error}. Correct it while preserving every other fact.`,
        ],
      });
      validation = validateGoldenEventTranslation({ ...input, translation });
    }
    if (!validation.value) throw new Error(validation.error ?? 'Golden validation failed');

    return validation.value;
  }

  async function runCase(testCase: (typeof cases)[number]): Promise<void> {
    try {
      await translateWithGoldenQuality(testCase);

      passed += 1;
      console.log(`Passed ${testCase.slug} (${testCase.locale})`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed ${testCase.slug} (${testCase.locale}): ${message}`);
      if (error instanceof EventTranslationValidationError) {
        console.error(error.translation);
      }
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
  description: string;
}>): string {
  return `# Event description translation dry run\n\n${entries
    .map(({ slug, locale, description }) => `## ${slug} (${locale})\n\n${description}`)
    .join('\n\n---\n\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.golden) {
    await runGolden();
    return;
  }
  const events = await getEventTranslationCandidates(options.limit);
  const savedSlugs = new Set<string>();
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const reviewEntries: Array<{
    slug: string;
    locale: EventTranslationLocale;
    description: string;
  }> = [];

  const tasks = events.flatMap((event) =>
    options.locales.map((locale) => async () => {
      try {
        if (!options.force && await hasEventTranslation({ eventId: event.id, locale })) {
          skipped += 1;
          console.log(`Skipped ${event.slug} (${locale}): already translated`);
          return;
        }

        let description = await translateEventDescription({
          source: event.description,
          locale,
        });
        let qualityValidation = validateGoldenEventTranslation({
          slug: event.slug,
          source: event.description,
          translation: description,
          locale,
        });
        if (!qualityValidation.value) {
          description = await translateEventDescription({
            source: event.description,
            locale,
            additionalInstructions: [
              `This is a quality correction. Your previous translation failed this required check: ${qualityValidation.error}. Correct it while preserving every other fact.`,
            ],
          });
          qualityValidation = validateGoldenEventTranslation({
            slug: event.slug,
            source: event.description,
            translation: description,
            locale,
          });
        }
        if (!qualityValidation.value) {
          throw new Error(qualityValidation.error ?? 'Golden validation failed');
        }
        description = qualityValidation.value;
        generated += 1;

        if (options.apply) {
          await saveEventTranslation({ eventId: event.id, locale, description });
          savedSlugs.add(event.slug);
          console.log(`Saved ${event.slug} (${locale})`);
        } else {
          reviewEntries.push({ slug: event.slug, locale, description });
          console.log(`\n${event.slug} (${locale})\n${description}\n`);
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed ${event.slug} (${locale}): ${message}`);
      }
    }),
  );

  const concurrency = 6;
  for (let index = 0; index < tasks.length; index += concurrency) {
    await Promise.all(tasks.slice(index, index + concurrency).map((task) => task()));
  }

  if (options.apply) {
    await revalidate([...savedSlugs]);
  } else if (options.outputFile) {
    await writeFile(options.outputFile, formatReview(reviewEntries), 'utf8');
    console.log(`Saved review output to ${options.outputFile}`);
  }

  console.log(
    `Completed ${options.all ? 'all events' : `${events.length} events`}: ${generated} generated, ${skipped} skipped, ${failed} failed.`,
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
import { writeFile } from 'node:fs/promises';
