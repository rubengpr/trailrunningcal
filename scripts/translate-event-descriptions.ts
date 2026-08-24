import {
  getEventTranslationCandidates,
  hasEventTranslation,
  saveEventTranslation,
} from '@/lib/db/event-translations';
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
};

function usage(): never {
  throw new Error(
    'Usage: --locales=ca,en,fr (--limit=20 | --all) [--dry-run | --apply] [--force]',
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

  if (apply === dryRun || (all && limitArg) || (!all && !limitArg)) usage();

  const limit = all
    ? 10_000
    : Number(limitArg?.slice('--limit='.length));
  if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) usage();

  return {
    locales: parseLocales(localesArg?.slice('--locales='.length)),
    limit,
    apply,
    force: args.includes('--force'),
    all,
  };
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
