import { writeFile } from 'node:fs/promises';

import { mergePages } from '../lib/spider/join-markdown';
import {
  spiderCloudCrawl,
  type SpiderCloudCrawlOptions,
} from '../lib/spider/client';
import {
  RACE_DATA_FORMAT_VERSION,
  raceDataMarkdownFileRepoRelativePath,
} from '../lib/data/race-data-version';

interface ParsedCli {
  seedUrl: string;
  format: 'json' | 'markdown';
  outputPath: string | undefined;
  crawlOptions: SpiderCloudCrawlOptions;
}

function printUsageAndExit(code: number): never {
  console.error('Usage: npm run spider:crawl -- <url> [--json | --md] [-o <path>]');
  console.error('  Default: JSON to stdout (same as --json).');
  console.error('  --md    Join crawl markdown into one document (stdout).');
  console.error('  -o path Write joined markdown to path (requires --md).');
  console.error('  --chrome            Use Spider request mode chrome (JS rendering).');
  console.error('  --wait-delay-secs N After load, wait N seconds before capture (Spider wait_for.delay).');
  console.error('  --request-timeout N Per-page timeout in seconds (default from API).');
  console.error(
    `Example: npm run spider:crawl -- https://example.com --md -o ${raceDataMarkdownFileRepoRelativePath('example-com')}`,
  );
  console.error(
    '  JS-heavy pages: npm run spider:crawl -- https://rocanegra.cat/classica/ --md --chrome --wait-delay-secs 6',
  );
  console.error(
    `  Versioned race data files use ${RACE_DATA_FORMAT_VERSION} (see lib/data/race-data-version.ts).`,
  );
  process.exit(code);
}

function parseArgs(argv: string[]): ParsedCli {
  let format: 'json' | 'markdown' = 'json';
  let outputPath: string | undefined;
  let useChrome = false;
  let waitDelaySecs: number | undefined;
  let requestTimeout: number | undefined;
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      format = 'json';
      continue;
    }
    if (arg === '--md') {
      format = 'markdown';
      continue;
    }
    if (arg === '--chrome') {
      useChrome = true;
      continue;
    }
    if (arg === '--wait-delay-secs') {
      const next = argv[i + 1];
      const n = next !== undefined ? Number(next) : NaN;
      if (!Number.isFinite(n) || n < 0) {
        console.error('Error: --wait-delay-secs requires a non-negative number.');
        printUsageAndExit(1);
      }
      waitDelaySecs = n;
      i += 1;
      continue;
    }
    if (arg === '--request-timeout') {
      const next = argv[i + 1];
      const n = next !== undefined ? Number(next) : NaN;
      if (!Number.isFinite(n) || n < 1) {
        console.error('Error: --request-timeout requires a positive number (seconds).');
        printUsageAndExit(1);
      }
      requestTimeout = Math.floor(n);
      i += 1;
      continue;
    }
    if (arg === '-o') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        console.error('Error: -o requires a file path.');
        printUsageAndExit(1);
      }
      outputPath = next;
      i += 1;
      continue;
    }
    if (arg.startsWith('-')) {
      console.error(`Error: unknown flag ${arg}`);
      printUsageAndExit(1);
    }
    positionals.push(arg);
  }

  const seedUrl = positionals[0];
  if (!seedUrl) {
    printUsageAndExit(1);
  }

  if (outputPath !== undefined && format !== 'markdown') {
    console.error('Error: -o is only valid with --md.');
    printUsageAndExit(1);
  }

  const crawlOptions: SpiderCloudCrawlOptions = {};
  if (useChrome) {
    crawlOptions.request = 'chrome';
  }
  if (waitDelaySecs !== undefined) {
    const secs = Math.floor(waitDelaySecs);
    crawlOptions.waitFor = { delay: { secs, nanos: 0 } };
  }
  if (requestTimeout !== undefined) {
    crawlOptions.requestTimeout = requestTimeout;
  }

  return { seedUrl, format, outputPath, crawlOptions };
}

async function main(): Promise<void> {
  const { seedUrl, format, outputPath, crawlOptions } = parseArgs(
    process.argv.slice(2),
  );

  try {
    const pages = await spiderCloudCrawl(seedUrl, crawlOptions);
    if (format === 'json') {
      console.log(JSON.stringify(pages, null, 2));
      return;
    }
    const markdown = mergePages(seedUrl, pages);
    if (outputPath !== undefined) {
      await writeFile(outputPath, markdown, 'utf8');
      return;
    }
    console.log(markdown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

void main();
