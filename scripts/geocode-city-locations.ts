/**
 * Batch geocode distinct (city, province) pairs from `races` via Nominatim Search API.
 * Geocoded coordinates are © OpenStreetMap contributors, ODbL — see https://www.openstreetmap.org/copyright
 * API usage must follow: https://operations.osmfoundation.org/policies/nominatim/
 * Search API: https://nominatim.org/release-docs/develop/api/Search/
 */

import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { CONTACT_EMAIL } from '../lib/config';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const REQUEST_DELAY_MS = 1100;
const CACHE_PATH = path.join(process.cwd(), 'scripts', '.cache', 'nominatim-city-locations.json');
const FAILURES_PATH = path.join(
  process.cwd(),
  'scripts',
  'geocode-city-locations-failures.json',
);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NOMINATIM_CONTACT_EMAIL =
  process.env.NOMINATIM_CONTACT_EMAIL ?? CONTACT_EMAIL;

const USER_AGENT = `TrailRunningCalCityGeocoder/1.0 (https://www.trailrunningcal.com; ${NOMINATIM_CONTACT_EMAIL})`;

interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

interface CachedEntry {
  latitude: number;
  longitude: number;
  nominatimDisplayName: string;
  addressSnippet: string | null;
}

type CacheStore = Record<string, CachedEntry>;

interface GeocodeResultRow {
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  nominatimDisplayName: string;
  addressSnippet: string | null;
  source: 'cache' | 'nominatim';
}

interface FailureRow {
  city: string;
  province: string;
  reason: string;
}

function pairKey(city: string, province: string): string {
  return `${city}|${province}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function parseArgs(): { printSql: boolean; upsert: boolean } {
  const argv = process.argv.slice(2);
  return {
    printSql: argv.includes('--print-sql'),
    upsert: argv.includes('--upsert'),
  };
}

async function loadCache(): Promise<CacheStore> {
  try {
    const raw = await readFile(CACHE_PATH, 'utf-8');
    return JSON.parse(raw) as CacheStore;
  } catch {
    return {};
  }
}

async function saveCache(cache: CacheStore): Promise<void> {
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

async function fetchDistinctPairs(): Promise<Array<{ city: string; province: string }>> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('races')
    .select('city, province')
    .not('city', 'is', null)
    .not('province', 'is', null);

  if (error) {
    console.error('Failed to fetch races:', error.message);
    process.exit(1);
  }

  const seen = new Set<string>();
  const pairs: Array<{ city: string; province: string }> = [];

  for (const row of data ?? []) {
    const city = (row as { city: string }).city.trim();
    const province = (row as { province: string }).province.trim();
    if (!city || !province) continue;
    const key = pairKey(city, province);
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ city, province });
  }

  pairs.sort((a, b) =>
    a.province === b.province ? a.city.localeCompare(b.city) : a.province.localeCompare(b.province),
  );

  return pairs;
}

function countryForProvince(province: string): { name: string; code: string } {
  if (province === 'Andorra') {
    return { name: 'Andorra', code: 'ad' };
  }

  return { name: 'Spain', code: 'es' };
}

function buildNominatimUrl(city: string, province: string): string {
  const country = countryForProvince(province);
  const query = province === country.name ? `${city}, ${country.name}` : `${city}, ${province}, ${country.name}`;
  const params = new URLSearchParams({
    q: query,
    countrycodes: country.code,
    limit: '1',
    format: 'jsonv2',
    addressdetails: '1',
    email: NOMINATIM_CONTACT_EMAIL,
  });
  return `${NOMINATIM_BASE}?${params.toString()}`;
}

function addressSnippetFromHit(hit: NominatimHit): string | null {
  if (!hit.address || Object.keys(hit.address).length === 0) {
    return null;
  }
  return JSON.stringify(hit.address);
}

async function fetchNominatim(
  city: string,
  province: string,
): Promise<{ hit: NominatimHit } | { error: string }> {
  const url = buildNominatimUrl(city, province);
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return { error: `HTTP ${response.status} ${response.statusText}` };
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data) || data.length === 0) {
    return { error: 'No results' };
  }

  const first = data[0] as NominatimHit;
  if (typeof first.lat !== 'string' || typeof first.lon !== 'string') {
    return { error: 'Invalid response shape' };
  }

  return { hit: first };
}

async function main(): Promise<void> {
  const { printSql, upsert } = parseArgs();

  const pairs = await fetchDistinctPairs();
  console.error(`Found ${pairs.length} distinct (city, province) pairs.`);

  const cache = await loadCache();
  const results: GeocodeResultRow[] = [];
  const failures: FailureRow[] = [];
  let networkCalls = 0;

  for (const { city, province } of pairs) {
    const key = pairKey(city, province);
    const cached = cache[key];

    if (cached) {
      results.push({
        city,
        province,
        latitude: cached.latitude,
        longitude: cached.longitude,
        nominatimDisplayName: cached.nominatimDisplayName,
        addressSnippet: cached.addressSnippet,
        source: 'cache',
      });
      continue;
    }

    if (networkCalls > 0) {
      await delay(REQUEST_DELAY_MS);
    }

    const outcome = await fetchNominatim(city, province);
    networkCalls += 1;

    if ('error' in outcome) {
      failures.push({ city, province, reason: outcome.error });
      console.error(`FAIL ${city} / ${province}: ${outcome.error}`);
      continue;
    }

    const { hit } = outcome;
    const latitude = Number.parseFloat(hit.lat);
    const longitude = Number.parseFloat(hit.lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      failures.push({ city, province, reason: 'Invalid lat/lon' });
      console.error(`FAIL ${city} / ${province}: Invalid lat/lon`);
      continue;
    }

    const entry: CachedEntry = {
      latitude,
      longitude,
      nominatimDisplayName: hit.display_name,
      addressSnippet: addressSnippetFromHit(hit),
    };

    cache[key] = entry;
    await saveCache(cache);

    results.push({
      city,
      province,
      latitude,
      longitude,
      nominatimDisplayName: hit.display_name,
      addressSnippet: entry.addressSnippet,
      source: 'nominatim',
    });
  }

  if (printSql) {
    for (const row of results) {
      const sql = `INSERT INTO city_locations (city, province, latitude, longitude) VALUES ('${escapeSqlString(row.city)}', '${escapeSqlString(row.province)}', ${row.latitude}, ${row.longitude}) ON CONFLICT (city, province) DO NOTHING;`;
      console.log(sql);
    }
  } else {
    for (const row of results) {
      console.log(
        JSON.stringify({
          city: row.city,
          province: row.province,
          latitude: row.latitude,
          longitude: row.longitude,
          nominatimDisplayName: row.nominatimDisplayName,
          addressSnippet: row.addressSnippet,
          source: row.source,
        }),
      );
    }
  }

  if (upsert) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env for --upsert');
      process.exit(1);
    }
    if (results.length === 0) {
      console.error('No successful geocodes to upsert.');
    } else {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const payload = results.map((row) => ({
        city: row.city,
        province: row.province,
        latitude: row.latitude,
        longitude: row.longitude,
      }));
      const { error: upsertError } = await supabase
        .from('city_locations')
        .upsert(payload, { onConflict: 'city,province' });
      if (upsertError) {
        console.error('Upsert failed:', upsertError.message);
        process.exit(1);
      }
      console.error(`Upserted ${results.length} rows into city_locations.`);
    }
  }

  await writeFile(FAILURES_PATH, JSON.stringify(failures, null, 2), 'utf-8');
  console.error(
    `\nSummary: ${results.length} ok, ${failures.length} failed. Failures written to ${FAILURES_PATH}`,
  );

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
