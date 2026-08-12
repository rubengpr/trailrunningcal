import { readFile, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  LOCAL_TRACK_IMPORT_PROJECT,
  isLocalTrackImportProject,
  normalizeTrackImportBaseUrl,
} from '@/lib/race-tracks/project';
import { MAX_TRACK_FILE_SIZE_BYTES } from '@/lib/race-tracks/parse';

interface Arguments {
  eventSlug: string;
  raceName: string;
  filePath: string;
  baseUrl: string;
  apply: boolean;
  yes: boolean;
}

interface ImportResponse {
  success: true;
  data: {
    mode: 'dry-run' | 'apply';
    raceId: string;
    eventSlug: string;
    geometryType: 'LineString' | 'MultiLineString';
    segmentCount: number;
    pointCount: number;
    normalizedSizeBytes: number;
  };
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function parseArguments(args: string[]): Arguments {
  const eventSlug = readOption(args, '--event');
  const raceName = readOption(args, '--race');
  const filePath = readOption(args, '--file');
  const baseUrl = readOption(args, '--base-url') ?? 'http://localhost:3000';

  if (!eventSlug || !raceName || !filePath) {
    throw new Error(
      'Usage: pnpm track:import -- --event <slug> --race <name> --file <path> [--base-url <url>] [--apply] [--yes]',
    );
  }

  return {
    eventSlug,
    raceName,
    filePath,
    baseUrl: normalizeTrackImportBaseUrl(baseUrl),
    apply: args.includes('--apply'),
    yes: args.includes('--yes'),
  };
}

async function confirmApply(target: string): Promise<void> {
  if (!input.isTTY) {
    throw new Error('Apply mode requires --yes when stdin is not interactive');
  }

  const prompt = createInterface({ input, output });
  try {
    const answer = await prompt.question(`Apply track to ${target}? Type "yes": `);
    if (answer.trim().toLowerCase() !== 'yes') {
      throw new Error('Import cancelled');
    }
  } finally {
    prompt.close();
  }
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const secret = process.env.IMPORT_TRACK_SECRET;
  if (!secret) throw new Error('Missing IMPORT_TRACK_SECRET');

  if (!args.apply) {
    if (!isLocalTrackImportProject(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      throw new Error(`Dry-run must target ${LOCAL_TRACK_IMPORT_PROJECT}`);
    }

    const hostname = new URL(args.baseUrl).hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      throw new Error('Dry-run must use the local application');
    }
  } else if (!args.yes) {
    await confirmApply(args.baseUrl);
  }

  const file = await stat(args.filePath);
  if (!file.isFile()) throw new Error('Track path must point to a file');
  if (file.size === 0 || file.size > MAX_TRACK_FILE_SIZE_BYTES) {
    throw new Error(
      `Track file must be between 1 byte and ${MAX_TRACK_FILE_SIZE_BYTES} bytes`,
    );
  }
  const fileBytes = await readFile(args.filePath);
  const formData = new FormData();
  formData.set('eventSlug', args.eventSlug);
  formData.set('raceName', args.raceName);
  formData.set('mode', args.apply ? 'apply' : 'dry-run');
  formData.set(
    'file',
    new Blob([new Uint8Array(fileBytes)], { type: 'application/gpx+xml' }),
    args.filePath.split('/').at(-1) ?? 'track.gpx',
  );

  console.log(
    `${args.apply ? 'Applying to' : `Dry-running against ${LOCAL_TRACK_IMPORT_PROJECT} via`} ${args.baseUrl}`,
  );

  const response = await fetch(`${args.baseUrl}/api/race-tracks`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
    body: formData,
  });
  const payload = (await response.json()) as ImportResponse | { error?: string };

  if (!response.ok || !('success' in payload)) {
    throw new Error(
      `Import failed (${response.status}): ${'error' in payload ? payload.error ?? 'Unknown error' : 'Unknown error'}`,
    );
  }

  const { data } = payload;
  console.log(`Matched race: ${args.raceName} (${data.raceId})`);
  console.log(
    `Geometry: ${data.geometryType}, ${data.segmentCount} segment(s), ${data.pointCount} points, ${data.normalizedSizeBytes} bytes`,
  );
  console.log(data.mode === 'apply' ? 'Track imported.' : 'Dry-run complete; no data changed.');
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Track import failed');
  process.exitCode = 1;
});
