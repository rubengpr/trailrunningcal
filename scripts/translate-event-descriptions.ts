import {
  getEventTranslationCandidates,
  hasEventTranslation,
  saveEventTranslation,
} from '@/lib/db/event-translations';
import {
  getGoldenTranslationCases,
  validateGoldenEventTranslation,
} from '@/lib/services/event-translation-golden';
import { translateEventDescription } from '@/lib/services/event-translations';
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
};

function usage(): never {
  throw new Error(
    'Usage: --locales=ca,en,fr (--limit=20 | --all) [--dry-run | --apply] [--force]\n       --golden --locales=ca,en,fr --dry-run',
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
    return { locales, limit: 0, apply: false, force: false, all: false, golden: true };
  }

  if (apply === dryRun || (all && limitArg) || (!all && !limitArg)) usage();

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
  };
}

async function runGolden(): Promise<void> {
  const cases = getGoldenTranslationCases();
  let passed = 0;
  let failed = 0;

  for (const testCase of cases) {
    try {
      let translation = await translateEventDescription({
        source: testCase.source,
        locale: testCase.locale,
      });
      let validation = validateGoldenEventTranslation({
        ...testCase,
        translation,
      });
      if (!validation.value) {
        translation = await translateEventDescription({
          source: testCase.source,
          locale: testCase.locale,
          additionalInstructions: [
            `This is a quality correction. Your previous translation failed this required check: ${validation.error}. Correct it while preserving every other fact.`,
          ],
        });
        validation = validateGoldenEventTranslation({
          ...testCase,
          translation,
        });
      }
      if (!validation.value) throw new Error(validation.error ?? 'Golden validation failed');

      passed += 1;
      console.log(`Passed ${testCase.slug} (${testCase.locale})`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed ${testCase.slug} (${testCase.locale}): ${message}`);
    }
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

  for (const event of events) {
    for (const locale of options.locales) {
      try {
        if (!options.force && await hasEventTranslation({ eventId: event.id, locale })) {
          skipped += 1;
          console.log(`Skipped ${event.slug} (${locale}): already translated`);
          continue;
        }

        const description = await translateEventDescription({
          source: event.description,
          locale,
        });
        generated += 1;

        if (options.apply) {
          await saveEventTranslation({ eventId: event.id, locale, description });
          savedSlugs.add(event.slug);
          console.log(`Saved ${event.slug} (${locale})`);
        } else {
          console.log(`\n${event.slug} (${locale})\n${description}\n`);
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed ${event.slug} (${locale}): ${message}`);
      }
    }
  }

  if (options.apply) {
    await revalidate([...savedSlugs]);
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
